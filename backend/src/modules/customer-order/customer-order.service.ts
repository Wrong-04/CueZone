import mongoose, { Types } from "mongoose";
import { NotificationService } from "../notification/notification.service";
import { NotificationType } from "../notification/notification.model";
import { User, UserRole } from "../user/user.model";
import { Product } from "../product/product.model";
import { Table, TableStatus } from "../table/table.model";
import { SessionService, sessionBelongsToCustomer } from "../session/session.service";
import {
  CustomerOrder,
  CustomerOrderStatus,
  ICustomerOrderItem,
} from "./customer-order.model";

const notifications = new NotificationService();

const httpError = (message: string, httpCode = 400) =>
  Object.assign(new Error(message), { httpCode });

function assertOrderableSession(table: { status: string; currentSession?: any }) {
  const current = table.currentSession;
  if (
    !current ||
    ![TableStatus.PLAYING, TableStatus.PAUSED].includes(table.status as TableStatus) ||
    (current.checkoutState !== undefined && current.checkoutState !== "open")
  ) {
    throw httpError("Phiên bàn không còn nhận order hoặc đang thanh toán", 409);
  }
}

function formatStatus(status: CustomerOrderStatus) {
  const labels: Record<CustomerOrderStatus, string> = {
    [CustomerOrderStatus.PENDING]: "Đang chờ quầy xác nhận",
    [CustomerOrderStatus.PREPARING]: "Đang chuẩn bị món",
    [CustomerOrderStatus.READY]: "Món đã sẵn sàng",
    [CustomerOrderStatus.SERVED]: "Đã phục vụ",
    [CustomerOrderStatus.REJECTED]: "Order không được tiếp nhận",
  };
  return labels[status];
}

export class CustomerOrderService {
  async getActiveTables(customerId: string) {
    return new SessionService().getCustomerSessions(customerId);
  }

  async create(customerId: string, input: { tableId?: unknown; sessionId?: unknown; items?: unknown; note?: unknown }) {
    if (!mongoose.isValidObjectId(customerId)) throw httpError("Tài khoản không hợp lệ", 401);
    if (!mongoose.isValidObjectId(input.tableId) || typeof input.sessionId !== "string" || !input.sessionId) {
      throw httpError("Vui lòng xác nhận lại bàn đang sử dụng");
    }
    if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 30) {
      throw httpError("Order phải có từ 1 đến 30 món");
    }
    if (input.note !== undefined && (typeof input.note !== "string" || input.note.trim().length > 500)) {
      throw httpError("Ghi chú không được vượt quá 500 ký tự");
    }
    const user = await User.findOne({
      _id: customerId,
      role: UserRole.CUSTOMER,
      isActive: true,
      isLocked: false,
    }).select("name phone");
    if (!user) throw httpError("Tài khoản không hợp lệ", 403);

    const requestedItems = input.items.map((item) => {
      if (!item || typeof item !== "object") throw httpError("Danh sách món không hợp lệ");
      const { productId, quantity } = item as { productId?: unknown; quantity?: unknown };
      if (
        !mongoose.isValidObjectId(productId) ||
        !Number.isSafeInteger(quantity) ||
        Number(quantity) < 1 ||
        Number(quantity) > 50
      ) {
        throw httpError("Mã sản phẩm hoặc số lượng món không hợp lệ");
      }
      return { productId: new Types.ObjectId(String(productId)), quantity: Number(quantity) };
    });
    const productIds = [...new Set(requestedItems.map((item) => String(item.productId)))];
    if (productIds.length !== requestedItems.length) {
      throw httpError("Mỗi món chỉ được xuất hiện một lần trong giỏ");
    }
    const products = await Product.find({
      _id: { $in: productIds },
      category: { $in: ["drink", "food", "snack"] },
      isForSale: true,
      isActive: true,
    }).select("_id name category salePrice stock");
    if (products.length !== requestedItems.length) {
      throw httpError("Một hoặc nhiều món không còn được bán");
    }
    const productById = new Map(products.map((product) => [String(product._id), product]));
    const items: ICustomerOrderItem[] = requestedItems.map(({ productId, quantity }) => {
      const product = productById.get(String(productId))!;
      if (product.stock < quantity) throw httpError(`Món ${product.name} không đủ số lượng tồn kho`, 409);
      return {
        productId: product._id,
        name: product.name,
        category: product.category,
        unitPrice: product.salePrice,
        quantity,
      };
    });

    const orderCode = `FNB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${new Types.ObjectId().toString().slice(-6).toUpperCase()}`;
    const order = await mongoose.connection.transaction(async (session) => {
      const table = await Table.findOne({
        _id: input.tableId,
        "currentSession.sessionId": input.sessionId,
        status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] },
      }).session(session);
      assertOrderableSession(table || { status: "available" });
      if (
        !table?.currentSession ||
        !sessionBelongsToCustomer(table.currentSession, user)
      ) {
        throw httpError("Bàn đã thay đổi hoặc không thuộc phiên chơi của tài khoản này", 403);
      }

      table.currentSession.customerOrderRevision =
        (table.currentSession.customerOrderRevision || 0) + 1;
      await table.save({ session });
      const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const [created] = await CustomerOrder.create(
        [
          {
            orderCode,
            customerId: user._id,
            tableId: table._id,
            tableCode: table.code,
            tableName: table.name,
            sessionId: input.sessionId,
            items,
            totalAmount,
            note: typeof input.note === "string" ? input.note.trim() : "",
            status: CustomerOrderStatus.PENDING,
            statusMessage: formatStatus(CustomerOrderStatus.PENDING),
          },
        ],
        { session },
      );
      return created;
    });

    const orderItems = order.items as ICustomerOrderItem[];
    await notifications
      .createForRoles(
        {
          title: `Order mới tại ${order.tableName}`,
          content: `Mã ${order.orderCode}: ${orderItems.map((item) => `${item.name} x${item.quantity}`).join(", ")}. Tổng ${order.totalAmount.toLocaleString("vi-VN")}đ.`,
          type: NotificationType.SYSTEM,
        },
        [UserRole.ADMIN, UserRole.STAFF, UserRole.CASHIER],
      )
      .catch((error) => console.error("Không thể gửi thông báo order mới:", error));
    return order;
  }

  async getForCustomer(orderId: string, customerId: string) {
    if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(customerId)) {
      throw httpError("Mã order không hợp lệ");
    }
    const order = await CustomerOrder.findOne({ _id: orderId, customerId });
    if (!order) throw httpError("Không tìm thấy order", 404);
    return order;
  }

  async getQueue() {
    return CustomerOrder.find({
      status: { $in: [CustomerOrderStatus.PENDING, CustomerOrderStatus.PREPARING, CustomerOrderStatus.READY] },
    }).sort({ createdAt: 1 });
  }

  async updateStatus(orderId: string, statusValue: unknown, rejectedReasonValue?: unknown) {
    if (!mongoose.isValidObjectId(orderId)) throw httpError("Mã order không hợp lệ");
    if (!Object.values(CustomerOrderStatus).includes(statusValue as CustomerOrderStatus)) {
      throw httpError("Trạng thái order không hợp lệ");
    }
    const nextStatus = statusValue as CustomerOrderStatus;
    if (nextStatus === CustomerOrderStatus.REJECTED &&
      (typeof rejectedReasonValue !== "string" || !rejectedReasonValue.trim())) {
      throw httpError("Vui lòng nhập lý do từ chối order");
    }

    const order = await mongoose.connection.transaction(async (session) => {
      const current = await CustomerOrder.findById(orderId).session(session);
      if (!current) throw httpError("Không tìm thấy order", 404);
      const currentStatus = current.status as CustomerOrderStatus;
      const allowed: Record<CustomerOrderStatus, CustomerOrderStatus[]> = {
        [CustomerOrderStatus.PENDING]: [CustomerOrderStatus.PREPARING, CustomerOrderStatus.REJECTED],
        [CustomerOrderStatus.PREPARING]: [CustomerOrderStatus.READY],
        [CustomerOrderStatus.READY]: [CustomerOrderStatus.SERVED],
        [CustomerOrderStatus.SERVED]: [],
        [CustomerOrderStatus.REJECTED]: [],
      };
      if (!allowed[currentStatus].includes(nextStatus)) {
        throw httpError("Không thể chuyển order từ trạng thái hiện tại sang trạng thái này", 409);
      }

      if (nextStatus === CustomerOrderStatus.PREPARING) {
        const table = await Table.findOne({
          _id: current.tableId,
          "currentSession.sessionId": current.sessionId,
          status: { $in: [TableStatus.PLAYING, TableStatus.PAUSED] },
        }).session(session);
        if (
          !table?.currentSession ||
          (table.currentSession.checkoutState !== undefined &&
            table.currentSession.checkoutState !== "open")
        ) {
          current.status = CustomerOrderStatus.REJECTED;
          current.rejectedReason = "Phiên chơi đã kết thúc trước khi quầy xác nhận order";
          current.statusMessage = "Phiên bàn đã kết thúc, order không thể tiếp nhận";
          current.processedAt = new Date();
          await current.save({ session });
          return current;
        }

        const currentItems = current.items as ICustomerOrderItem[];
        for (const item of currentItems) {
          const product = await Product.findOneAndUpdate(
            {
              _id: item.productId,
              isActive: true,
              isForSale: true,
              stock: { $gte: item.quantity },
            },
            { $inc: { stock: -item.quantity } },
            { new: true, session },
          );
          if (!product) throw httpError(`Món ${item.name} vừa hết hàng, không thể xác nhận order`, 409);
        }
        table.currentSession.customerOrderRevision =
          (table.currentSession.customerOrderRevision || 0) + 1;
        table.currentSession.orders.push(
          ...currentItems.map((item) => ({
            id: `portal-${current.id}-${String(item.productId)}`,
            name: item.name,
            price: item.unitPrice,
            quantity: item.quantity,
            category: item.category,
            orderTime: new Date().toLocaleTimeString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: "pending",
          })),
        );
        await table.save({ session });
      }

      current.status = nextStatus;
      current.statusMessage = formatStatus(nextStatus);
      current.rejectedReason =
        nextStatus === CustomerOrderStatus.REJECTED && typeof rejectedReasonValue === "string"
          ? rejectedReasonValue.trim()
          : undefined;
      current.processedAt = new Date();
      await current.save({ session });
      return current;
    });

    await notifications
      .createForUser(String(order.customerId), {
        title: `Cập nhật order ${order.orderCode}`,
        content: order.rejectedReason
          ? `${formatStatus(order.status)}: ${order.rejectedReason}`
          : formatStatus(order.status),
        type: NotificationType.SYSTEM,
      })
      .catch((error) => console.error("Không thể gửi cập nhật trạng thái order:", error));
    return order;
  }
}
