import { useState, useEffect } from "react";
import { api } from "@/services/core/apiClient";
import { useToast } from "@/components/shared/toast-provider";

export function useDiagnostics() {
  const [health, setHealth] = useState(null);
  const [services, setServices] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { push: toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [hRes, sRes, iRes, tRes, jRes] = await Promise.all([
        api.get("/platform/diagnostics/health/"),
        api.get("/platform/diagnostics/services/"),
        api.get("/platform/diagnostics/incidents/"),
        api.get("/platform/diagnostics/tenants/"),
        api.get("/platform/diagnostics/jobs/")
      ]);
      setHealth(hRes.data);
      setServices(sRes.data);
      setIncidents(iRes.data.results);
      setTenants(tRes.data.results);
      setJobs(jRes.data.results);
    } catch (error) {
      console.error(error);
      toast({ message: "Failed to load diagnostic telemetry", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (endpoint, action, serviceName = null) => {
    try {
      await api.post(`/platform/diagnostics/${endpoint}/`, { action, service: serviceName });
      toast({ message: `Action '${action}' executed successfully.` });
      loadData();
    } catch (err) {
      toast({ message: `Failed to execute action`, variant: "error" });
    }
  };

  return {
    health,
    services,
    incidents,
    tenants,
    jobs,
    loading,
    loadData,
    handleAction
  };
}
