import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebaseClient";
import AuthModal from "../components/AuthModal";

export default function Login() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/chat");
      } else {
        setChecking(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (checking) return null;

  return (
    <AuthModal
      isOpen={true}
      onClose={() => router.push("/")}
      startInSignUp={false}
    />
  );
}
