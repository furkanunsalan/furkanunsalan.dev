export function slugify(text: string): string {
    const trMap: Record<string, string> = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
    };

    return text
        .split('')
        .map(char => trMap[char] || char) // Türkçe karakterleri değiştir
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-') // Geçersiz karakterleri '-' ile değiştir
        .replace(/^-+|-+$/g, '') // Baştaki ve sondaki '-' işaretlerini kaldır
        .replace(/--+/g, '-'); // Birden fazla '-' işaretini tek '-' yap
}