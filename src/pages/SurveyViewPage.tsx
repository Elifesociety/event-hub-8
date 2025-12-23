import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { SurveyView } from "@/components/survey/SurveyView";
import { Card, CardContent } from "@/components/ui/card";
import { User, MapPin } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

export default function SurveyViewPage() {
  const [searchParams] = useSearchParams();
  const [showThankYou, setShowThankYou] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  
  const name = searchParams.get("name");
  const panchayath = searchParams.get("panchayath");
  const ward = searchParams.get("ward");

  // Show thank you popup when page loads with referral params
  useEffect(() => {
    if (name && panchayath && ward && !viewCounted) {
      setShowThankYou(true);
    }
  }, [name, panchayath, ward, viewCounted]);

  const handleThankYouClose = async () => {
    if (name && panchayath && ward && !viewCounted) {
      // Find the survey_share record and increment view_count
      const { data: shares } = await supabase
        .from('survey_shares')
        .select('id, view_count, panchayaths!inner(name), wards!inner(ward_number)')
        .eq('name', name);
      
      if (shares && shares.length > 0) {
        // Find matching share by panchayath name and ward number
        const matchingShare = shares.find((share: any) => 
          share.panchayaths?.name === panchayath && 
          share.wards?.ward_number === ward
        );
        
        if (matchingShare) {
          await supabase
            .from('survey_shares')
            .update({ view_count: (matchingShare.view_count || 0) + 1 })
            .eq('id', matchingShare.id);
        }
      }
      setViewCounted(true);
    }
    setShowThankYou(false);
  };

  return (
    <PageLayout>
      {/* Thank You Popup */}
      <AlertDialog open={showThankYou} onOpenChange={setShowThankYou}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl">🙏 Thank You!</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              Thank you for visiting! This survey link was shared by <span className="font-semibold text-foreground">{name}</span>
              {panchayath && (
                <> from <span className="font-semibold text-foreground">{panchayath}</span></>
              )}
              {ward && (
                <>, Ward <span className="font-semibold text-foreground">{ward}</span></>
              )}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={handleThankYouClose} className="px-8">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
