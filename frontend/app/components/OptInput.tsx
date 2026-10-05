"use client";

import { OTPInput } from "input-otp";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function OtpInput({
  value,
  onChange,
  disabled = false,
}: OtpInputProps) {
  return (
    <OTPInput
      value={value}
      onChange={onChange}
      maxLength={6}
      disabled={disabled}
      containerClassName="flex justify-center"
      render={({ slots }) => (
        <div className="flex gap-4">
          {slots.map((slot, index) => (
            <div
              key={index}
              className={`flex h-15 w-15 items-center justify-center rounded-lg border 
                bg-[#101d2d] text-lg font-semibold text-white transition-all
                ${slot.isActive
                  ? "border-purple-400 ring-2 ring-purple-500/20"
                  : "border-white/10"
                }
              `}
            >
              {slot.char}
            </div>
          ))}
        </div>
      )}
    />
  );
}