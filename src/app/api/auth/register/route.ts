import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { generateId } from "@/lib/utils"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "邮箱和密码是必填项" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email)

    if (existingUser) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
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
    `).run(userId, email, passwordHash, name || email.split("@")[0])

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
