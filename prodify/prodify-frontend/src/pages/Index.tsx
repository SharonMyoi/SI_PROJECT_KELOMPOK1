import { Navigate } from "react-router-dom";
import { useStore } from "@/store/useStore";

const Index = () => {
  const { currentUser } = useStore();
  if (currentUser) return <Navigate to={`/${currentUser.role}`} replace />;
  return <Navigate to="/login" replace />;
};

export default Index;
