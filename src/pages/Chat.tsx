import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";

interface SourceUrl {
  meeting_id: string;
  url: string;
  title: string;
  date?: string;
}

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  sources?: SourceUrl[];
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Hello! I'm your civic AI assistant. I can help you find information about La Canada Flintridge city meetings, decisions, and public records. What would you like to know?",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      content: userMessage,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: userMessage,
          session_id: sessionId,
          search_context: true,
          max_context_results: 5,
        },
      });

      if (error) {
        throw error;
      }

      const botMessage: Message = {
        id: crypto.randomUUID(),
        content: data.response || "I apologize, but I couldn't process your request. Please try again.",
        isBot: true,
        timestamp: new Date(),
        sources: data.source_urls || [],
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: "I'm sorry, I encountered an error. Please try asking your question again.",
        isBot: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Civic AI Assistant</h1>
          <p className="text-muted-foreground">
            Ask questions about La Canada Flintridge city meetings, decisions, and public records.
          </p>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Chat with AI Assistant
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 min-h-0">
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${!message.isBot ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.isBot 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                      {message.isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    
                     <div className={`flex-1 max-w-[80%] ${!message.isBot ? "text-right" : ""}`}>
                       <div className={`inline-block p-3 rounded-lg ${
                         message.isBot
                           ? "bg-muted text-foreground"
                           : "bg-primary text-primary-foreground"
                       }`}>
                         <p className="whitespace-pre-wrap">{message.content}</p>
                         
                         {/* Show source links for bot messages */}
                         {message.isBot && message.sources && message.sources.length > 0 && (
                           <div className="mt-3 pt-3 border-t border-border/50">
                             <p className="text-xs font-medium text-muted-foreground mb-2">Sources:</p>
                             <div className="space-y-1">
                               {message.sources.map((source, index) => (
                                 <a
                                   key={index}
                                   href={source.url}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                 >
                                   <ExternalLink className="h-3 w-3" />
                                   {source.title} {source.date && `(${source.date})`}
                                 </a>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                       <p className="text-xs text-muted-foreground mt-1">
                         {message.timestamp.toLocaleTimeString()}
                       </p>
                     </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-6">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about city meetings, decisions, or public records..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default Chat;