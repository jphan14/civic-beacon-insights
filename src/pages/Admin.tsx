import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Play, CheckCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";

const Admin = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [embeddingCount, setEmbeddingCount] = useState<number | null>(null);
  const [processResult, setProcessResult] = useState<any>(null);
  const { toast } = useToast();

  const checkEmbeddingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('document_embeddings')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      setEmbeddingCount(count || 0);
    } catch (error) {
      console.error('Error checking embeddings:', error);
      toast({
        title: "Error",
        description: "Failed to check embedding count",
        variant: "destructive",
      });
    }
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    setProcessResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("batch-process-meetings", {
        body: {
          startPage: 1,
          batchSize: 10
        }
      });

      if (error) throw error;

      setProcessResult(data);
      await checkEmbeddingCount();
      
      toast({
        title: "Success!",
        description: `Processed ${data.processedCount} meetings successfully`,
      });
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Error",
        description: "Failed to process meetings. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processAll = async () => {
    setIsProcessing(true);
    setProcessResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("batch-process-meetings", {
        body: {
          startPage: 1,
          batchSize: 2000 // Increased to handle all historical meetings
        }
      });

      if (error) throw error;

      setProcessResult(data);
      await checkEmbeddingCount();
      
      toast({
        title: "Success!",
        description: `Processed ${data.processedCount} meetings successfully`,
      });
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Error",
        description: "Failed to process meetings. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const debugApiCount = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("debug-api-count");
      
      if (error) throw error;
      
      console.log('API Debug Results:', data);
      toast({
        title: "Debug Complete",
        description: `Found ${data.totalMeetingsFound} total meetings. Check console for details.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error debugging API:', error);
      toast({
        title: "Error",
        description: "Failed to debug API",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const testSearch = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("test-search");
      
      if (error) throw error;
      
      console.log('Search Test Results:', data);
      toast({
        title: "Search Test Complete",
        description: "Check console for detailed results",
        variant: "default",
      });
    } catch (error) {
      console.error('Error testing search:', error);
      toast({
        title: "Error",
        description: "Failed to test search",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage AI chat embeddings and system data.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Meeting Embeddings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current embeddings in database</p>
                  <div className="flex items-center gap-2 mt-1">
                    {embeddingCount !== null ? (
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {embeddingCount} embeddings
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not checked</Badge>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={checkEmbeddingCount}
                  disabled={isProcessing}
                >
                  Refresh Count
                </Button>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Process Meeting Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Create embeddings from meeting content for AI search
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={startProcessing}
                      disabled={isProcessing}
                      className="min-w-[140px]"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Process Batch (10)
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={processAll}
                      disabled={isProcessing}
                      variant="outline"
                      className="min-w-[140px]"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Process All
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={debugApiCount}
                      disabled={isProcessing}
                      variant="secondary"
                      className="min-w-[140px]"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Debugging...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Debug API Count
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={testSearch}
                      variant="outline"
                      className="min-w-[140px]"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Test Search
                    </Button>
                  </div>
                </div>

                {processResult && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Processing Complete</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>Processed: <strong>{processResult.processedCount}</strong> meetings</p>
                      <p>Status: <strong>{processResult.success ? 'Success' : 'Failed'}</strong></p>
                      {processResult.message && (
                        <p className="text-muted-foreground">{processResult.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-medium">1.</span>
                  <span>Click "Start Processing" to create embeddings from your meeting data</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium">2.</span>
                  <span>Once processing is complete, the AI chat will be able to search through meetings</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium">3.</span>
                  <span>Test the AI chat by asking questions about specific meetings or topics</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
};

export default Admin;