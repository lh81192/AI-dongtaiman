import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"
import { generateId } from "@/lib/utils"

// Zod validation schema for registration
const registerSchema = z.object({
  name: z.string().min(1, "昵称是必填项"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少需要8个字符"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input with Zod
    const validationResult = registerSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = (validationResult.error as any).errors.map((err: any) => err.message)
      return NextResponse.json(
        { error: errors[0] },
        { status: 400 }
      )
    }

    const { name, email, password } = validationResult.data

    // Check if user already exists (use generic error to prevent user enumeration)
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email)

    if (existingUser) {
      return NextResponse.json(
        { error: "注册失败，请稍后重试" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const userId = generateId()
    db.prepare(`
      INSERT INTO users (id, email, password_hash, nickname, role, created_at)
      VALUES (?, ?, ?, ?, 'user', datetime('now'))
    `).run(userId, email, passwordHash, name)

    return NextResponse.json(
      { message: "注册成功", userId },
      { status: 201 }
    )
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    )
  }
}
