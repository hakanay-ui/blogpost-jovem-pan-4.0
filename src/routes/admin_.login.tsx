import { createFileRoute } from "@tanstack/react-router";
import LoginSignupForm from "@/components/auth/LoginSignupForm";

export const Route = createFileRoute("/admin_/login")({
  component: LoginSignupForm,
});
