import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebaseClient";

export default function Chat() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (checking) return null;

  return (
    <>
      <Head>
        <title>Chat | Fabion</title>
      </Head>
      <iframe
        src="/chat-ui.html"
        title="Fabion Chat"
        style={{
          border: "none",
          width: "100vw",
          height: "100vh",
          display: "block",
        }}
      />
    </>
  );
}
