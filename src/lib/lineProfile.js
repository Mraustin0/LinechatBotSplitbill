const prisma = require('./prisma');

// upsert user พร้อม display_name จาก LINE profile
async function upsertUser(client, userId, source) {
  let displayName = userId;

  try {
    if (source.type === 'group') {
      const profile = await client.getGroupMemberProfile(source.groupId, userId);
      displayName = profile.displayName;
    } else {
      const profile = await client.getProfile(userId);
      displayName = profile.displayName;
    }
  } catch (e) {
    // ถ้าดึงไม่ได้ ใช้ชื่อเดิมที่มีอยู่
  }

  return prisma.user.upsert({
    where: { line_user_id: userId },
    update: { display_name: displayName },
    create: { line_user_id: userId, display_name: displayName },
  });
}

module.exports = { upsertUser };
