import React from "react";
import Loader from "./Loader";

export default function LoadingButton({ isLoading, children, ...props }) {
  return (
    <button disabled={isLoading} {...props} className={`relative ${props.className || ""}`}>
      {isLoading && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2">
          <Loader size={18} />
        </span>
      )}
      <span className={isLoading ? "opacity-60 ml-6" : ""}>{children}</span>
    </button>
  );
}
