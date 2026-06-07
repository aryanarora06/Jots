// Geist/Vercel-inspired strict spring physics
export const microSpring = { type: 'spring', stiffness: 400, damping: 30 };

export const fadeEase = [0.4, 0.0, 0.2, 1]; // standard material-like crossfade easing

// Micro-interactions (Hovers, Taps, Clicks) - Retained per user request
export const tapAnimation = { scale: 0.98, transition: microSpring };
export const hoverAnimation = { y: -2, transition: microSpring };

// Modals
export const modalBackdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2, ease: fadeEase } },
    exit: { opacity: 0, transition: { duration: 0.15, ease: fadeEase } },
};

export const modalPanelVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2, ease: fadeEase } },
    exit: { opacity: 0, transition: { duration: 0.15, ease: fadeEase } },
};

// Dropdowns & Popovers
export const dropdownVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.15, ease: fadeEase } },
    exit: { opacity: 0, transition: { duration: 0.1, ease: fadeEase } },
};

// Cards & Lists
export const cardVariants = {
    initial: { opacity: 0 },
    animate: (delayIndex = 0) => {
        const delay = typeof delayIndex === 'number' ? Math.min(delayIndex * 0.02, 0.15) : 0;
        return {
            opacity: 1,
            transition: { duration: 0.2, ease: fadeEase, delay },
        };
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15, ease: fadeEase },
    },
};

// Layout transitions
export const tabContentVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.2, ease: fadeEase },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15, ease: fadeEase },
    },
};

// Slide-ups (Now just fade-ins)
export const slideUpVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2, ease: fadeEase } },
    exit: { opacity: 0, transition: { duration: 0.15, ease: fadeEase } },
};

