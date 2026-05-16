"use client";

import { useEffect, useState } from "react";

export default function DebugPage() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    setInfo({
      url: window.location.href,
      origin: window.location.origin,
      search: window.location.search,
      cookies: document.cookie,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  }, []);

  return (
    <div className="p-10 font-mono text-xs">
      <h1 className="mb-4 text-xl font-bold">Debug Auth</h1>
      <pre className="rounded bg-muted p-4">
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}
