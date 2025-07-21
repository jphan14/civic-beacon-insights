import { useIsMobile } from "@/hooks/use-mobile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Monitor } from "lucide-react";

const MobileBanner = () => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <Alert className="mx-4 my-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
      <Monitor className="h-4 w-4" />
      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
        This page does not work on mobile yet. Please open in desktop for the best experience.
      </AlertDescription>
    </Alert>
  );
};

export default MobileBanner;