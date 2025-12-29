import { Suspense } from "react"
import Wizard from "@/components/setup/Wizard";

function WizardWrapper() {
  return <Wizard />
}

export default function Home() {
  return (
    <main>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩 중...</div>}>
        <WizardWrapper />
      </Suspense>
    </main>
  );
}
