import { NextResponse } from 'next/server';
import { auth } from "@/auth";

export async function middleware(request) {
    const session = await auth();
    
    // If the user is not authenticated and not on the login page, redirect to login
    if (!session && !request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};