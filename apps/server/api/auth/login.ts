import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { handleError, sendSuccess, methodNotAllowed, ValidationError } from '../../lib/errors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new ValidationError('email and password are required');
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new ValidationError(error.message);
    }

    // Fetch profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    return sendSuccess(res, {
      user: { ...data.user, profile },
      session: data.session,
    });
  } catch (error) {
    return handleError(error, res);
  }
}
