import { useStatus } from "../lib/status-provider";

export default function StatusBanner() {
  const { serverDown } = useStatus();
  if (!serverDown) return null;
  return (
    <div className="fixed top-0 left-0 w-full bg-red-700 text-white text-center py-2 z-[9999]">
      Server is currently down
    </div>
  );
}
