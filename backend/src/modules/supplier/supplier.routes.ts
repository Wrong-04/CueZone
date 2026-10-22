import {
  Router,
  Request,
  Response,
  NextFunction,
} from "express";

import Supplier from "./supplier.model";

const router = Router();

function requireSupplierManager(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (
    req as Request & {
      user?: {
        role?: string;
      };
    }
  ).user;

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
        "Bạn không có quyền quản lý nhà cung cấp.",
    });
  }

  next();
}

function validateSupplier(
  body: any
) {
  if (
    !body ||
    typeof body.name !== "string" ||
    !body.name.trim()
  ) {
    return "Tên nhà cung cấp là bắt buộc.";
  }

  if (body.name.trim().length > 150) {
    return "Tên nhà cung cấp không được vượt quá 150 ký tự.";
  }

  if (
    body.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      body.email.trim()
    )
  ) {
    return "Email không hợp lệ.";
  }

  if (body.phone) {
    const phone =
      body.phone.trim();

    if (
      !/^(0(2[0-9][0-9]{7,8}|[35789][0-9]{8})|\+84(2[0-9][0-9]{7,8}|[35789][0-9]{8}))$/.test(
        phone
      )
    ) {
      return "Số điện thoại Việt Nam không hợp lệ (hỗ trợ di động và điện thoại bàn).";
    }
  }

  return null;
}

function pickSupplier(
  body: any
) {
  return {
    name: body.name.trim(),

    contactPerson:
      typeof body.contactPerson ===
      "string"
        ? body.contactPerson.trim()
        : "",

    phone:
      typeof body.phone === "string"
        ? body.phone.trim()
        : "",

    email:
      typeof body.email === "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "",

    address:
      typeof body.address ===
      "string"
        ? body.address.trim()
        : "",

    note:
      typeof body.note === "string"
        ? body.note.trim()
        : "",
  };
}

/*
 * GET /api/v1/suppliers
 */
router.get(
  "/",
  async (req: Request, res: Response) => {
    try {
      const search =
        typeof req.query.search ===
        "string"
          ? req.query.search.trim()
          : "";

      const status =
        typeof req.query.status ===
        "string"
          ? req.query.status
          : "active";

      const page = Math.max(
        Number(req.query.page) || 1,
        1
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit) ||
            20,
          1
        ),
        100
      );

      const filter: any = {};

      if (search) {
        filter.$or = [
          {
            name: {
              $regex: search,
              $options: "i",
            },
          },
          {
            contactPerson: {
              $regex: search,
              $options: "i",
            },
          },
          {
            phone: {
              $regex: search,
              $options: "i",
            },
          },
          {
            email: {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }

      if (status === "active") {
        filter.isActive = {
          $ne: false,
        };
      }

      if (status === "inactive") {
        filter.isActive = false;
      }

      const skip =
        (page - 1) * limit;

      const [
        data,
        total,
      ] = await Promise.all([
        Supplier.find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Supplier.countDocuments(
          filter
        ),
      ]);

      return res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(
            1,
            Math.ceil(
              total / limit
            )
          ),
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Không thể tải danh sách nhà cung cấp.",
      });
    }
  }
);

/*
 * GET /api/v1/suppliers/:id
 */
router.get(
  "/:id",
  async (req: Request, res: Response) => {
    try {
      const supplier =
        await Supplier.findById(
          req.params.id
        ).lean();

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy nhà cung cấp.",
        });
      }

      return res.json({
        success: true,
        data: supplier,
      });
    } catch {
      return res.status(400).json({
        success: false,
        message:
          "Mã nhà cung cấp không hợp lệ.",
      });
    }
  }
);

/*
 * POST /api/v1/suppliers
 */
router.post(
  "/",
  requireSupplierManager,
  async (req, res) => {
    try {
      const validation =
        validateSupplier(
          req.body
        );

      if (validation) {
        return res.status(400).json({
          success: false,
          message: validation,
        });
      }

      const supplier =
        await Supplier.create({
          ...pickSupplier(
            req.body
          ),
          isActive: true,
        });

      return res.status(201).json({
        success: true,
        message:
          "Thêm nhà cung cấp thành công.",
        data: supplier,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Không thể thêm nhà cung cấp.",
      });
    }
  }
);

/*
 * PUT /api/v1/suppliers/:id
 */
router.put(
  "/:id",
  requireSupplierManager,
  async (req, res) => {
    try {
      const validation =
        validateSupplier(
          req.body
        );

      if (validation) {
        return res.status(400).json({
          success: false,
          message: validation,
        });
      }

      const supplier =
        await Supplier.findByIdAndUpdate(
          req.params.id,
          {
            $set:
              pickSupplier(
                req.body
              ),
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy nhà cung cấp.",
        });
      }

      return res.json({
        success: true,
        message:
          "Cập nhật nhà cung cấp thành công.",
        data: supplier,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Không thể cập nhật nhà cung cấp.",
      });
    }
  }
);

/*
 * DELETE /api/v1/suppliers/:id
 *
 * Soft delete.
 */
router.delete(
  "/:id",
  requireSupplierManager,
  async (req, res) => {
    try {
      const supplier =
        await Supplier.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              isActive: false,
            },
          },
          {
            new: true,
          }
        );

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy nhà cung cấp.",
        });
      }

      return res.json({
        success: true,
        message:
          "Đã ngừng hợp tác với nhà cung cấp.",
        data: supplier,
      });
    } catch {
      return res.status(400).json({
        success: false,
        message:
          "Mã nhà cung cấp không hợp lệ.",
      });
    }
  }
);

/*
 * PATCH /api/v1/suppliers/:id/restore
 */
router.patch(
  "/:id/restore",
  requireSupplierManager,
  async (req, res) => {
    try {
      const supplier =
        await Supplier.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              isActive: true,
            },
          },
          {
            new: true,
          }
        );

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy nhà cung cấp.",
        });
      }

      return res.json({
        success: true,
        message:
          "Khôi phục nhà cung cấp thành công.",
        data: supplier,
      });
    } catch {
      return res.status(400).json({
        success: false,
        message:
          "Mã nhà cung cấp không hợp lệ.",
      });
    }
  }
);

export default router;