export const spring = { type: 'spring', stiffness: 400, damping: 32 };

export const cardVariants = {
    initial: { opacity: 0 },
    animate: (delayIndex = 0) => {
        const delay = typeof delayIndex === 'number'
            ? Math.min(delayIndex * 0.045, 0.28)
            : 0;

        return {
            opacity: 1,
            transition: {
                duration: 0.16,
                ease: 'easeOut',
                delay,
            },
        };
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.12, ease: 'easeIn' },
    },
};

export const tabContentVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.16, ease: 'easeOut' },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.12, ease: 'easeIn' },
    },
};

export const modalBackdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
};

export const modalPanelVariants = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0, transition: spring },
    exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.18 } },
};

export const selectionBarVariants = {
    initial: { opacity: 0, y: 28, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1, transition: spring },
    exit: { opacity: 0, y: 20, scale: 0.94, transition: { duration: 0.16 } },
};

export const dropdownVariants = {
    initial: { opacity: 0, y: -6, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15, ease: 'easeOut' } },
    exit: { opacity: 0, y: -4, scale: 0.97, transition: { duration: 0.12 } },
};
