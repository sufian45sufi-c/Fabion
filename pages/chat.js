import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebaseClient";

export default function Chat() {
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState(null);
  const iframeRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
        return;
      }
      setUserId(user.uid);
      setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Make the real Firebase user id available to the static HTML's script
    // via window.top.__FABION_USER_ID__ (read by getUserId() inside chat-ui.html).
    if (userId) {
      window.__FABION_USER_ID__ = userId;
    }
  }, [userId]);

  if (checking) return null;

  return (
    <>
      <Head>
        <title>Chat | Fabion</title>
      </Head>
      <iframe
        ref={iframeRef}
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
