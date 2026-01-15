export class Loader {
  constructor() { this.onProgress = null; }
  async load(manifest) {
    const images = manifest.images || {};
    const sounds = manifest.sounds || {};
    const total = Object.keys(images).length + Object.keys(sounds).length || 1;
    let done = 0;
    const bump = () => { done++; if (this.onProgress) this.onProgress(done/total); };

    const loadedImages = {};
    const imagePromises = Object.entries(images).map(([key, url]) => new Promise(res => {
      const img = new Image();
      img.onload = () => { loadedImages[key] = img; bump(); res(); };
      img.onerror = () => { console.warn('Image non trouvée:', url); loadedImages[key] = null; bump(); res(); };
      img.src = url;
    }));

    const loadedSounds = {};
    const soundPromises = Object.entries(sounds).map(([key, url]) => new Promise(res => {
      const audio = new Audio();
      audio.addEventListener('canplaythrough', () => { loadedSounds[key] = audio; bump(); res(); }, {once:true});
      audio.onerror = () => { console.warn('Son non trouvé:', url); loadedSounds[key] = null; bump(); res(); };
      audio.src = url; audio.load();
    }));

    await Promise.all([...imagePromises, ...soundPromises]);
    return { images: loadedImages, sounds: loadedSounds };
  }
}
