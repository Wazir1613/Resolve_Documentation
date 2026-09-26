const { createJwtVerifier } = require('../security/jwt');

const verifier = createJwtVerifier(process.env.JWT_SECRET, process.env.JWT_ISSUER);

async function authenticate(req, res, next)
{
    const header = req.header('authorization');

    if (!header || !/^Bearer\s+\S+$/i.test(header))
    {
        return res.status(401).json({ status: 401, code: 'AUTH_MISSING_TOKEN', message: 'Authentication is required' });
    }

    try
    {
        const token = header.slice(7).trim();
        const auth = await verifier.verify(token);
        req.organizationId = auth.tenantId;
        req.userId = auth.userId;
        next();
    }
    catch (err)
    {
        res.status(401).json({ status: 401, code: 'AUTH_MISSING_TOKEN', message: 'Authentication token is invalid' });
    }
}

module.exports = { authenticate };