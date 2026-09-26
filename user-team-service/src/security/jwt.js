const { jwtVerify } = require('jose');

function createJwtVerifier(secret, issuer)
{
    const key = new TextEncoder().encode(secret);

    return {
        async verify(token)
        {
            const { payload } = await jwtVerify(token, key, {
                issuer,
                algorithms: ['HS256'],
            });

            if (typeof payload.sub !== 'string' || typeof payload.tenantId !== 'string' || payload.type !== 'access')
            {
                throw new Error('Invalid token payload');
            }

            return {
                userId: payload.sub,
                tenantId: payload.tenantId,
            };
        },
    };
}

module.exports = { createJwtVerifier };