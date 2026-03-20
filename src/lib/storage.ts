import { supabase } from './supabase';

export async function uploadPhoto(file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('fotos')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        return null;
    }

    const { data } = supabase.storage.from('fotos').getPublicUrl(filePath);
    return data.publicUrl;
}
