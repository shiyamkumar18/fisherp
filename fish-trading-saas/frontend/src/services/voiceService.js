import { api } from "@/services/core/apiClient";

export const voiceService = {
  processVoiceText: async (text, language = 'en') => {
    try {
      const response = await api.post('/voice/process/', { text, language });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  confirmCommand: async (commandId, confirmed, corrections = {}) => {
    try {
      const response = await api.post('/voice/commands/confirm/', {
        command_id: commandId,
        confirmed,
        corrections
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCommandHistory: async () => {
    try {
      // Assuming a GET /voice/commands/ API exists to list recent commands
      // If it doesn't exist, we will gracefully return []
      const response = await api.get('/voice/commands/');
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) return [];
      throw error;
    }
  }
};
