const { SignJWT } = require('jose');
require('dotenv').config();
async function main()
{
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'replace-with-at-least-32-character-development-secret');

    const token = await new SignJWT({
        tenantId: '11111111-1111-1111-1111-111111111111',
        tokenId: 'token-' + Date.now(),
        type: 'access',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('test-admin-1')
        .setIssuer('resolve-authentication-service')
        .setIssuedAt()
        .setExpirationTime('2h')
        .sign(secret);

    console.log(token);
}

main();