"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

export default function Home() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function initLIFF() {
      try {
        await liff.init({
          liffId: "2009989826-L6OPDoa5",
        });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const userProfile = await liff.getProfile();
        setProfile(userProfile);
      } catch (error) {
        console.error(error);
      }
    }

    initLIFF();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">
          AnntiOS LIFF 🚀
        </h1>

        {profile ? (
          <div>
            <img
              src={profile.pictureUrl}
              alt="profile"
              className="w-24 h-24 rounded-full mx-auto mb-4"
            />

            <h2 className="text-2xl font-semibold">
              {profile.displayName}
            </h2>

            <p className="text-zinc-400 mt-2">
              User ID:
            </p>

            <p className="text-sm break-all max-w-md">
              {profile.userId}
            </p>
          </div>
        ) : (
          <p>Loading LIFF...</p>
        )}
      </div>
    </main>
  );
}