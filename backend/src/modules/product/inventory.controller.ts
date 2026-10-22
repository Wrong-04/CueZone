import {
  Request,
  Response,
} from "express";
import mongoose from "mongoose";

import Product from "./product.model";
import InventoryTransaction from "./inventory.model";

function getUser(req: Request) {
  return (
    req as Request & {
      user?: {
        _id?: string;
        id?: string;
        role?: string;
      };
    }
  ).user;
}

function getUserId(req: Request) {
  const user = getUser(req);

  return user?._id || user?.id || null;
}

export async function getInventory(
  req: Request,
  res: Response
) {
  try {
    const user = getUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const category =
      typeof req.query.category === "string"
        ? req.query.category.trim()
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status
        : "all";

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 20,
        1
      ),
      100
    );

    const filter: Record<
      string,
      unknown
    > = {
      isActive: {
        $ne: false,
      },
    };

    if (user.role === "staff") {
      filter.category = {
        $in: [
          "drink",
          "food",
          "snack",
        ],
      };

      filter.isForSale = true;
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          sku: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const products =
      await Product.find(filter)
        .sort({
          createdAt: -1,
        })
        .lean();

    const productsWithStatus =
      products
        .map((product: any) => {
          const stock =
            Number(product.stock) || 0;

          const minStock =
            Number(product.minStock) || 0;

          let stockStatus:
            | "in_stock"
            | "low"
            | "out";

          if (stock <= 0) {
            stockStatus = "out";
          } else if (
            stock <= minStock
          ) {
            stockStatus = "low";
          } else {
            stockStatus = "in_stock";
          }

          return {
            ...product,
            stock,
            minStock,
            stockStatus,
          };
        })
        .filter((product: any) => {
          if (
            status !== "all" &&
            product.stockStatus !== status
          ) {
            return false;
          }

          return true;
        });

    const total =
      productsWithStatus.length;

    const pages = Math.max(
      1,
      Math.ceil(total / limit)
    );

    const safePage = Math.min(
      page,
      pages
    );

    const start =
      (safePage - 1) * limit;

    const pageItems =
      productsWithStatus.slice(
        start,
        start + limit
      );

    const isStaff =
      user.role === "staff";

    const items =
      pageItems.map(
        (product: any) => {
          const result: any = {
            _id: product._id,
            sku: product.sku,
            name: product.name,
            category: product.category,
            unit: product.unit,
            stock: product.stock,
            minStock: product.minStock,
            salePrice:
              Number(
                product.salePrice
              ) || 0,
            stockStatus:
              product.stockStatus,
          };

          if (!isStaff) {
            result.costPrice =
              Number(
                product.costPrice
              ) || 0;
          }

          return result;
        }
      );

    return res.json({
      success: true,
      data: {
        items,
        total,
        page: safePage,
        limit,
        pages,
      },
    });
  } catch (error) {
    console.error(
      "GET INVENTORY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể tải dữ liệu tồn kho.",
    });
  }
}

export async function getInventoryHistory(
  req: Request,
  res: Response
) {
  try {
    const {
      productId,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã hàng hóa không hợp lệ.",
      });
    }

    const history =
      await InventoryTransaction.find({
        product: productId,
      })
        .populate(
          "performedBy",
          "name email role"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error(
      "GET INVENTORY HISTORY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể tải lịch sử tồn kho.",
    });
  }
}

export async function createInventoryTransaction(
  req: Request,
  res: Response
) {
  const session =
    await mongoose.startSession();

  try {
    const user = getUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    if (
      user.role !== "admin" &&
      user.role !== "warehouse"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Chỉ Admin hoặc Nhân viên kho được cập nhật tồn kho.",
      });
    }

    const performedBy =
      getUserId(req);

    if (
      !performedBy ||
      !mongoose.Types.ObjectId.isValid(
        performedBy
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Không xác định được tài khoản thực hiện.",
      });
    }

    const {
      product,
      type,
      quantity,
      reason,
    } = req.body;

    if (
      !product ||
      !mongoose.Types.ObjectId.isValid(
        product
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã hàng hóa không hợp lệ.",
      });
    }

    if (
      ![
        "in",
        "out",
        "adjustment",
      ].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Loại biến động kho không hợp lệ.",
      });
    }

    const parsedQuantity =
      Number(quantity);

    if (
      !Number.isFinite(
        parsedQuantity
      ) ||
      parsedQuantity < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Số lượng phải là số không âm.",
      });
    }

    if (
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Lý do biến động kho là bắt buộc.",
      });
    }

    let newProduct;

    await session.withTransaction(
      async () => {
        const currentProduct =
          await Product.findById(
            product
          ).session(session);

        if (!currentProduct) {
          throw new Error(
            "PRODUCT_NOT_FOUND"
          );
        }

        const previousStock =
          Number(
            (currentProduct as any)
              .stock
          ) || 0;

        let newStock =
          previousStock;

        if (type === "in") {
          newStock =
            previousStock +
            parsedQuantity;
        }

        if (type === "out") {
          newStock =
            previousStock -
            parsedQuantity;

          if (newStock < 0) {
            throw new Error(
              "INSUFFICIENT_STOCK"
            );
          }
        }

        if (type === "adjustment") {
          newStock =
            parsedQuantity;
        }

        (
          currentProduct as any
        ).stock = newStock;

        await currentProduct.save({
          session,
        });

        await InventoryTransaction.create(
          [
            {
              product:
                currentProduct._id,

              type,

              quantity:
                parsedQuantity,

              previousStock,

              newStock,

              reason:
                reason.trim(),

              performedBy,
            },
          ],
          {
            session,
          }
        );

        newProduct =
          currentProduct;
      }
    );

    return res.status(201).json({
      success: true,
      message:
        "Cập nhật tồn kho thành công.",
      data: {
        product: newProduct,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "PRODUCT_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy hàng hóa.",
      });
    }

    if (
      error instanceof Error &&
      error.message ===
        "INSUFFICIENT_STOCK"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Số lượng xuất kho vượt quá tồn kho hiện tại.",
      });
    }

    console.error(
      "CREATE INVENTORY TRANSACTION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể cập nhật tồn kho.",
    });
  } finally {
    await session.endSession();
  }
}