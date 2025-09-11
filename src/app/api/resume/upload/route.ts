import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import ResumeParsingService from '@/lib/resume-service';
import { getDbManager } from '@/lib/database';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF and DOCX files are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.type === 'application/pdf' ? 'pdf' : 'docx';
    const fileName = `resume-${session.user.id}-${timestamp}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Store file metadata in database
    const db = getDbManager(process.env.MONGODB_URI!);
    await db.connect();

    const fileData = {
      userId: (session.user as any).id,
      fileName: file.name,
      originalName: file.name,
      filePath,
      fileSize: file.size,
      mimeType: file.type,
      type: 'resume' as const,
      status: 'pending' as const,
      uploadedAt: new Date(),
    };

    const documentsCollection = await db.getDocumentsCollection();
    const result = await documentsCollection.insertOne(fileData);

    // Process resume asynchronously
    const resumeService = new ResumeParsingService();
    resumeService.processResumeFile(
      (session.user as any).id,
      filePath,
      file.name,
      fileExtension as 'pdf' | 'docx'
    ).catch(error => {
      console.error('Background resume processing failed:', error);
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId,
        fileName: file.name,
        fileSize: file.size,
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}