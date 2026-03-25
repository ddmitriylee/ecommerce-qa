import { cors } from '../../lib/cors.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { handleError, sendSuccess, methodNotAllowed, ValidationError } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const { email, password, full_name } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
    };

    if (!email || !password || !full_name) {
      throw new ValidationError('email, password, and full_name are required');
    }

    const supabase = getSupabaseAdmin();

    // Create user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw new ValidationError(authError.message);
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        full_name,
        role: 'customer',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Sign in to get tokens
    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw new ValidationError(signInError.message);
    }

    return sendSuccess(res, {
      user: authData.user,
      session: session.session,
    }, 201);
  } catch (error) {
    return handleError(error, res);
  }
}
