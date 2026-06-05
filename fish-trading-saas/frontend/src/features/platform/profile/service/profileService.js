import { apiClient } from "@/services/apiClient";
import { config } from "@/config";

const profileMock = {
	id: 1,
	username: "john_trader",
	email: "john@fisherp.com",
	role: "trader",
	role_display: "Trader",
	company: "Sunrise Seafood Co.",
	schema_name: "sunrise-seafood",
	two_factor_enabled: false,
	is_platform_user: false,
};

export const fetchProfile = async () => {
	if (config.useMocks) return profileMock;
	const response = await apiClient.get("/auth/profile/");
	return response.data;
};

export const updateProfile = async (patch) => {
	if (config.useMocks) return { ...profileMock, ...patch };
	const response = await apiClient.patch("/auth/profile/", patch);
	return response.data;
};