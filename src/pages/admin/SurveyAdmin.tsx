import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { PanchayathManagement } from '@/components/admin/survey/PanchayathManagement';
import { SurveyResults } from '@/components/admin/survey/SurveyResults';
import { SurveyContentManagement } from '@/components/admin/survey/SurveyContentManagement';
import { MapPin, BarChart3, FileVideo } from 'lucide-react';

export default function SurveyAdmin() {
  const { admin, isLoading, isSuperAdmin } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !admin) {
      navigate('/admin-login');
    }
  }, [admin, isLoading, navigate]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  if (!admin) return null;

  return (
    <PageLayout>
      <div className="container py-8">
        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto gap-1">
            <TabsTrigger value="results" className="flex items-center gap-2 py-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Survey Results</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2 py-2">
              <FileVideo className="h-4 w-4" />
              <span className="text-xs sm:text-sm">View Page Content</span>
            </TabsTrigger>
            <TabsTrigger value="panchayath" className="flex items-center gap-2 py-2">
              <MapPin className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Panchayath & Wards</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <SurveyResults />
          </TabsContent>

          <TabsContent value="content">
            <SurveyContentManagement />
          </TabsContent>

          <TabsContent value="panchayath">
            <PanchayathManagement />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
