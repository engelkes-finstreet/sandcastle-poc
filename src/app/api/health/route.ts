import { NextResponse } from "next/server";

// Health check endpoint
export const GET = async () => {
  return NextResponse.json({ message: "Server is running" }, { status: 200 });
};
