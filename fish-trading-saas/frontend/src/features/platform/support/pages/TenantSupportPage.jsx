import React, { useState, useEffect } from "react";
import { 
  LifeBuoy, Plus, MessageCircle, AlertCircle, CheckCircle2, Clock, ShieldAlert 
} from "lucide-react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

export default function TenantSupportPage() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, this fetches from /api/platform/support/tickets/ (the existing endpoint)
    setTimeout(() => {
      setTickets([
        {
          id: 1,
          ticket_number: "TKT-1001",
          subject: "Issue with Auction Sync",
          status: "in_progress",
          priority: "high",
          category: "trading",
          created_at: new Date().toISOString(),
          sla_response_at: new Date(Date.now() + 3600000).toISOString()
        }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case "open": return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-bold">Open</span>;
      case "in_progress": return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-bold">In Progress</span>;
      case "escalated": return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-bold">Escalated</span>;
      case "resolved": return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-bold">Resolved</span>;
      case "closed": return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-bold">Closed</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-textPrimary tracking-tight flex items-center gap-2">
            <LifeBuoy className="text-primary" /> Support Center
          </h1>
          <p className="text-sm text-textSecondary">Submit tickets and get help from our platform experts.</p>
        </div>
        <Button className="flex items-center gap-2 px-6 h-11">
          <Plus size={16} /> New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="p-0 overflow-hidden shadow-sm">
            <div className="bg-surface border-b border-border p-4 flex justify-between items-center">
              <h3 className="font-bold text-textPrimary">Your Active Tickets</h3>
            </div>
            
            {loading ? (
              <div className="p-12 text-center text-textSecondary">Loading your support history...</div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/50 m-6">
                <div className="bg-primary/10 text-primary p-4 rounded-full mb-4 inline-flex">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h4 className="text-sm font-extrabold text-textPrimary mb-1">No Open Issues!</h4>
                <p className="text-xs text-textSecondary font-semibold">Everything looks good. Let us know if you need help.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="p-5 hover:bg-surfaceHover transition-colors cursor-pointer flex justify-between items-center group">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-xs font-bold text-textSecondary">{ticket.ticket_number}</span>
                        {getStatusBadge(ticket.status)}
                        {ticket.priority === 'high' && <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold uppercase tracking-wider"><AlertCircle size={12}/> High Priority</span>}
                      </div>
                      <h4 className="font-bold text-textPrimary text-base group-hover:text-primary transition-colors">{ticket.subject}</h4>
                      <div className="flex gap-4 mt-2 text-xs text-textSecondary">
                        <span className="flex items-center gap-1"><Clock size={12}/> Updated {new Date(ticket.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={12}/> 2 Replies</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5 bg-primary/5 border-primary/20">
            <h4 className="font-bold text-textPrimary mb-2 flex items-center gap-2"><ShieldAlert size={16} className="text-primary"/> Service Level Agreement</h4>
            <div className="text-sm text-textSecondary space-y-2">
              <p><strong>Critical:</strong> 30m Response</p>
              <p><strong>High:</strong> 2h Response</p>
              <p><strong>Medium:</strong> 12h Response</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
