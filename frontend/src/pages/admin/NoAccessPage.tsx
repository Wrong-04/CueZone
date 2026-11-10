import React from "react";
import { Button, Result } from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";

// Tài khoản nhân sự chưa được cấp quyền nào trên ma trận phân quyền.
const NoAccessPage: React.FC = () => {
  const { logout } = useAuth();
  return (
    <Result
      status="403"
      title="Chưa được cấp quyền truy cập"
      subTitle="Tài khoản của bạn chưa được cấp quyền cho chức năng nào. Vui lòng liên hệ quản lý để được phân quyền."
      extra={
        <Button variant="outline" onClick={logout}>
          Đăng xuất
        </Button>
      }
    />
  );
};

export default NoAccessPage;
