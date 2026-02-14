import User from '../models/User.js';

/**
 * Role-Based Access Control middleware.
 *
 * Roles: admin, engineer, contractor
 * - admin: full CRUD on all modules
 * - engineer: view-only for timeline, HSE, alerts, s-curve; can upload media
 * - contractor: view-only for timeline, HSE, alerts, s-curve; can upload media
 *
 * Usage:  requireRole('admin')           — only admins
 *         requireRole('admin', 'contractor') — admins OR contractors
 */
export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId).select('role').lean();
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const userRole = user.role || 'admin'; // Default to admin for existing users without role
      if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
        req.userRole = userRole;
        return next();
      }

      return res.status(403).json({ error: 'Insufficient permissions' });
    } catch (err) {
      console.error('RBAC middleware error:', err);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

/**
 * Attach user role to request (non-blocking).
 * Use when you need role info for UI decisions but don't want to block.
 */
export async function attachRole(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('role').lean();
    req.userRole = user?.role || 'admin';
  } catch {
    req.userRole = 'admin';
  }
  next();
}
