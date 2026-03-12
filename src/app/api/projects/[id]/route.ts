import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, characters, shots, dialogues } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch related data
  const projectCharacters = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, id));

  const projectShots = await db
    .select()
    .from(shots)
    .where(eq(shots.projectId, id))
    .orderBy(asc(shots.sequence));

  // Enrich each shot with its dialogues (including character name)
  const enrichedShots = await Promise.all(
    projectShots.map(async (shot) => {
      const shotDialogues = await db
        .select({
          id: dialogues.id,
          text: dialogues.text,
          characterId: dialogues.characterId,
          characterName: characters.name,
          sequence: dialogues.sequence,
        })
        .from(dialogues)
        .innerJoin(characters, eq(dialogues.characterId, characters.id))
        .where(eq(dialogues.shotId, shot.id))
        .orderBy(asc(dialogues.sequence));
      return { ...shot, dialogues: shotDialogues };
    })
  );

  return NextResponse.json({
    ...project,
    characters: projectCharacters,
    shots: enrichedShots,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<{
    title: string;
    idea: string;
    script: string;
    status: "draft" | "processing" | "completed";
  }>;

  const [updated] = await db
    .update(projects)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(projects).where(eq(projects.id, id));
  return new NextResponse(null, { status: 204 });
}
