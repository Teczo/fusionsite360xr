export function derivePlanFromUser(user) {
    const key = String(user?.billing?.planKey || '').toUpperCase();
    let plan = 'FREE';
    if (key === 'SINGLE' || key === 'FOUNDING') plan = key;

    const capabilitiesTier = (plan === 'FREE') ? 'FREE' : 'PRO';

    // Limits (you can tune these centrally)
    const limits = (capabilitiesTier === 'FREE') ? {
        sharedProjects: { max: 1 },
        teamMembers: { max: 3 }, // owner + 2 collaborators
        uploadSizeMB: 25,
        watermark: true,
    } : {
        sharedProjects: { max: Infinity },
        teamMembers: { max: Infinity },
        uploadSizeMB: 500,
        watermark: false,
    };

    return { plan, capabilitiesTier, limits };
}
