import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Bot, User, Loader2, ExternalLink, AlertTriangle, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from '@supabase/supabase-js';
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
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
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
    // Check auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setIsAuthLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      const redirectUrl = `${window.location.origin}/chat`;
      
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl }
        });
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Please check your email for verification link.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Welcome back!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !user) return;

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  if (isAuthLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5" />
                  {isSignUp ? "Sign Up" : "Sign In"} to Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Authentication is required to use the AI chat feature.
                  </AlertDescription>
                </Alert>
                
                <form onSubmit={handleAuth} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full">
                    {isSignUp ? "Sign Up" : "Sign In"}
                  </Button>
                </form>
                
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-primary hover:underline"
                  >
                    {isSignUp 
                      ? "Already have an account? Sign in" 
                      : "Need an account? Sign up"
                    }
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen flex flex-col">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Civic AI Assistant</h1>
            <p className="text-muted-foreground">
              Ask questions about La Canada Flintridge city meetings, decisions, and public records.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            This AI assistant is still under construction and may be buggy. Results may not always be accurate or complete.
          </AlertDescription>
        </Alert>

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
                <Button type="submit" disabled={isLoading || !inputValue.trim() || !user}>
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