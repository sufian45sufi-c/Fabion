import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Fabion | An AI platform for creativity</title>
      </Head>
      <iframe
        src="/landing.html"
        title="Fabion Landing"
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
