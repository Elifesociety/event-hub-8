import { useSearchParams } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { SurveyView } from "@/components/survey/SurveyView";
import { Card, CardContent } from "@/components/ui/card";
import { User, MapPin } from "lucide-react";

export default function SurveyViewPage() {
  const [searchParams] = useSearchParams();
  
  const name = searchParams.get("name");
  const panchayath = searchParams.get("panchayath");
  const ward = searchParams.get("ward");

  return (
    <PageLayout>
      <div className="container py-6 space-y-6">
        {/* Show referral info if available */}
        {name && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Shared by:</span>
                  <span className="font-medium text-foreground">{name}</span>
                </div>
                {panchayath && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">From:</span>
                    <span className="font-medium text-foreground">
                      {panchayath}{ward ? `, Ward ${ward}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        <SurveyView />
      </div>
    </PageLayout>
  );
}
