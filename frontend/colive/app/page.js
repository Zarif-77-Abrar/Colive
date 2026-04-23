"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "../lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
    } else if (user.role === "admin") {
      router.push("/admin/dashboard");
    } else if (user.role === "owner") {
      router.push("/owner/dashboard");
    } else {
      router.push("/tenant/dashboard");
    }
  }, [router]);

  return null;
}
