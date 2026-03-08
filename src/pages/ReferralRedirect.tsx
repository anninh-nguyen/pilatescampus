import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ReferralRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/login?ref=${code}`, { replace: true });
  }, [code, navigate]);

  return null;
}
