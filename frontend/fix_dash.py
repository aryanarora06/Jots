import re

with open(r'c:\Users\DELL\Desktop\dead\frontend\src\pages\Dashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

my_notes_old = """                            {isLoading ? (
                                <div className="flex justify-center items-center h-64">
                                </div>
                            ) : filteredNotes.length > 0 ? (
                                <>
                                    <motion.div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pt-1 relative">"""

my_notes_new = """                            <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center items-center h-64">
                                </motion.div>
                            ) : filteredNotes.length > 0 ? (
                                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <motion.div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pt-1 relative">"""

my_notes_end_old = """                                    )}
                                </>
                            ) : (
                                <motion.div
                                    initial={animateCardEntrance ? { opacity: 0 } : false}"""

my_notes_end_new = """                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}"""

my_notes_close_old = """                                </motion.div>
                            )}
                        </motion.div>"""
my_notes_close_new = """                                </motion.div>
                            )}
                            </AnimatePresence>
                        </motion.div>"""

shared_notes_old = """                            {isLoadingShared ? (
                                <div className="flex justify-center items-center h-64">
                                </div>
                            ) : filteredSharedNotes.length > 0 ? (
                                <motion.div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pt-1">"""

shared_notes_new = """                            <AnimatePresence mode="wait">
                            {isLoadingShared ? (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center items-center h-64">
                                </motion.div>
                            ) : filteredSharedNotes.length > 0 ? (
                                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pt-1">"""

shared_notes_end_old = """                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={animateCardEntrance ? { opacity: 0 } : false}"""

shared_notes_end_new = """                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}"""

shared_notes_close_old = """                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'graph'"""
shared_notes_close_new = """                                </motion.div>
                            )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {activeTab === 'graph'"""

content = content.replace(my_notes_old, my_notes_new)
content = content.replace(my_notes_end_old, my_notes_end_new)
content = content.replace(my_notes_close_old, my_notes_close_new)
content = content.replace(shared_notes_old, shared_notes_new)
content = content.replace(shared_notes_end_old, shared_notes_end_new)
content = content.replace(shared_notes_close_old, shared_notes_close_new)

with open(r'c:\Users\DELL\Desktop\dead\frontend\src\pages\Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
