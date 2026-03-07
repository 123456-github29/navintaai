import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PencilSquareIcon, PaperAirplaneIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface EditPlanChatProps {
  projectId: string;
  contentPlanId: string;
}

export function EditPlanChat({ projectId, contentPlanId }: EditPlanChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your creative director. Tell me how you'd like to modify your content plan.\n\nTry things like:\n• \"Make the scripts more bold\"\n• \"Shorten all videos to quick hits\"\n• \"Add more storytelling\"\n• \"Make week 2 focus on selling\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingChanges, setPendingChanges] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const editMutation = useMutation({
    mutationFn: async (request: string) => {
      const response = await apiRequest("POST", `/api/content-plan/${contentPlanId}/edit`, {
        editRequest: request,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPendingChanges(data);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `I've prepared the changes you requested. Here's a preview:\n\n${data.summary || "Plan updated with your requested modifications."}\n\nWould you like to apply these changes?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error: Error) => {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `I couldn't make those changes: ${error.message}. Could you try rephrasing your request?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/content-plan/${contentPlanId}/apply-edit`, {
        editedPlan: pendingChanges.editedPlan,
      });
      return response.json();
    },
    onSuccess: () => {
      setPendingChanges(null);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-plan"] });
      
      const successMessage: Message = {
        id: `success-${Date.now()}`,
        role: "assistant",
        content: "Changes applied successfully! Your content plan has been updated. Feel free to ask for more modifications.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
      
      toast({
        title: "Plan updated",
        description: "Your content plan has been modified.",
      });
    },
    onError: (error: Error) => {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Failed to apply changes: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || editMutation.isPending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    editMutation.mutate(input.trim());
    setInput("");
  };

  const handleApply = () => {
    applyMutation.mutate();
  };

  const handleDiscard = () => {
    setPendingChanges(null);
    const discardMessage: Message = {
      id: `discard-${Date.now()}`,
      role: "assistant",
      content: "Changes discarded. What else would you like to modify?",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, discardMessage]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10 gap-2"
        >
          <PencilSquareIcon className="h-4 w-4" />
          Edit Plan
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg bg-black border-l border-white/10 flex flex-col">
        <SheetHeader className="border-b border-white/10 pb-4">
          <SheetTitle className="text-white text-xl">Chat with Navinta AI</SheetTitle>
          <p className="text-white/50 text-sm">
            Tell me how you'd like to modify your content plan
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-[#135bec] text-white"
                    : "bg-white/10 text-white/90"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          
          {editMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl px-4 py-3 text-sm text-white/70">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#135bec] animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-[#135bec] animate-pulse" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-[#135bec] animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {pendingChanges && (
          <div className="border-t border-white/10 pt-4 pb-2">
            <div className="flex gap-2">
              <Button
                onClick={handleApply}
                disabled={applyMutation.isPending}
                className="flex-1 bg-[#135bec] hover:bg-[#135bec]/90 text-white gap-2"
              >
                <CheckIcon className="h-4 w-4" />
                Apply Changes
              </Button>
              <Button
                onClick={handleDiscard}
                disabled={applyMutation.isPending}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 gap-2"
              >
                <XMarkIcon className="h-4 w-4" />
                Discard
              </Button>
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me what to change..."
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[44px] max-h-[120px] resize-none"
              disabled={editMutation.isPending || applyMutation.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || editMutation.isPending || applyMutation.isPending}
              className="bg-[#135bec] hover:bg-[#135bec]/90 text-white h-11 w-11 p-0"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
