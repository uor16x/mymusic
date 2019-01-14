function MainController($scope, AuthService, MusicService, Notification) {
    $scope.user = null;
    const initModalOptions = {
        show: false
    };
    $scope.modals = {
        addPlaylist: $('#addPlaylistModal').modal(initModalOptions),
        removePlaylist: $('#removePlaylistModal').modal(initModalOptions),
        removeSong: $('#removeSongModal').modal(initModalOptions),
        addSong: $('#addSongModal').modal(initModalOptions),
        renamePlaylist: $('#renamePlaylistModal').modal(initModalOptions),
        renameSong: $('#renameSongModal').modal(initModalOptions),
        copySongs: $('#copySongsModal').modal(initModalOptions)
    };
    $scope.music = {
        playing: false,
        repeat: false,
        audio: $('#audio')[0],

        currentTime: '00:00',
        durationTime: '00:00',

        newPlaylistName: '',
        newSongYoutubeLink: '',
        newSongFile: null,
        newSongInput: $('#newSongDisk'),

        renamePlaylistName: '',
        renameSongTitle: '',

        currentPlaylistName: '',
        currentPlaylistId: null,
        currentPlaylistSongs: [],

        currentPlayingPlaylistName: '',
        currentPlayingPlaylistId: null,
        currentPlayingPlaylistSongs: [],

        currentSongId: null,
        currentSongTitle: ''
    };

    $scope.loading = true;
    $scope.authData = {
        username: '',
        password: ''
    };

    AuthService.authGet()
        .then(response => {
            if (response.data) {
                AuthService.set(response.data);
                $scope.user = response.data;
                Notification.primary(`Welcome, ${$scope.user.username}!`);
            }
        })
        .catch(err => Notification.info(err.data))
        .finally(() => {
            $scope.loading = false;
        });

    $scope.authPost = function () {
        if (!$scope.authData.username) {
            return Notification.info('Username missing');
        }
        if (!$scope.authData.password) {
            return Notification.info('Password missing');
        }
        $scope.loading = true;
        AuthService.authPost($scope.authData)
            .then(response => {
                if (response.data) {
                    AuthService.set(response.data);
                    $scope.user = response.data;
                    Notification.primary(`Welcome, ${$scope.user.username}!`);
                }

            })
            .catch(err => Notification.info(err.data))
            .finally(() => {
                $scope.authData.password = '';
                $scope.loading = false;
            });
    };

    $scope.logout = function () {
        $scope.loading = true;
        AuthService.authDelete()
            .then(response => {
                Notification.primary(`See you next time, ${$scope.user.username}!`);
                AuthService.set(null);
                $scope.user = null;
            })
            .catch(err => Notification.info(err.data))
            .finally(() => {
                $scope.loading = false;
            });
    };

    $scope.addPlaylist = () => {
        if (!$scope.music.newPlaylistName) {
            return Notification.info('Playlist name missing');
        }
        $scope.loading = true;
        $scope.modals.addPlaylist.modal('hide');
        MusicService.addPlaylist($scope.music.newPlaylistName)
            .then(response => {
                if (response.data) {
                    Notification.success('Successfully added playlist');
                    $scope.user.playlists = response.data;
                }
            })
            .catch(err => Notification.info(err.data))
            .finally(() => {
                $scope.loading = false;
                $scope.music.newPlaylistName = '';
            });
        $scope.music.newPlaylistName = '';
    };

    $scope.removePlaylist = (item) => {
        if (confirm(`Are you sure you want to delete ${item.name}?`)) {
            MusicService.removePlaylist(item._id)
                .then(response => {
                    if (response.data) {
                        $scope.user.playlists = response.data;
                        const currVisible = $scope.music.currentPlaylistId === item._id;
                        const currPlaying = $scope.music.currentPlayingPlaylistId === item._id;
                        if (currVisible) {
                            $scope.pause();
                            $scope.music.currentPlaylistId = null;
                            $scope.music.currentPlaylistName = '';
                            $scope.music.currentPlaylistSongs = [];
                        }
                        if (currPlaying) {
                            $scope.pause();
                            $scope.music.currentSongId = null;
                            $scope.music.currentSongTitle = '';
                            $scope.music.audio.src = '';
                            $scope.music.currentPlayingPlaylistId = null;
                            $scope.music.currentPlayingPlaylistName = '';
                            $scope.music.currentPlayingPlaylistSongs = [];
                        }
                    }
                })
                .catch(err => Notification.error(err.data));
        }
    };

    $scope.removeSong = item => {
        if ($scope.music.currentSongId === item._id) {
            return Notification.info('You can\'t delete song, which is currently playing');
        }
        const plistID = $scope.music.currentPlaylistId;
        if (confirm(`Are you sure you want to delete ${item.title}?`)) {
            MusicService.removeSong(plistID, item._id)
                .then(response => {
                    if (response.data) {
                        if ($scope.music.currentPlaylistId === plistID) {
                            $scope.music.currentPlaylistSongs = response.data;
                        }
                        if ($scope.music.currentPlayingPlaylistId === plistID) {
                            $scope.music.currentPlayingPlaylistSongs = response.data;
                        }
                    }
                })
                .catch(err => Notification.error(err.data));
        }
    };

    $scope.renamePlaylist = () => {
        const name = $scope.music.renamePlaylistName;
        if (!name) {
            return Notification.info('Playlist name missing');
        }
        const plistId = $scope.music.currentPlaylistId;
        $scope.loading = true;
        $scope.modals.renamePlaylist.modal('hide');
        MusicService.renamePlaylist(plistId, name)
            .then(response => {
                if (response.data) {
                    Notification.success('Successfully renamed playlist');
                    const plistIndex = $scope.user.playlists.findIndex(plist => plist._id === plistId);
                    $scope.user.playlists[plistIndex] = response.data;
                    if ($scope.music.currentPlayingPlaylistId) {
                        $scope.music.currentPlayingPlaylistName = response.data.name;
                        $scope.music.currentPlayingPlaylistSongs = response.data.songs;
                    }
                }
            })
            .catch(err => Notification.info(err.data));
        $scope.music.renamePlaylistName = '';
    };

    $scope.renameSong = () => {
        const title = $scope.music.renameSongTitle;
        if (!title) {
            return Notification.info('Playlist name missing');
        }
        const songId = $scope.music.currentSongId;
        const currentPlaylistId = $scope.music.currentPlayingPlaylistId;
        $scope.modals.renameSong.modal('hide');
        MusicService.renameSong(songId, $scope.music.renameSongTitle)
            .then(response => {
                if ($scope.music.currentSongId === songId) {
                    $scope.music.currentSongTitle = title;
                }
                if ($scope.music.currentPlaylistId === currentPlaylistId) {
                    const index = $scope.music.currentPlaylistSongs.findIndex(s => s._id === songId);
                    $scope.music.currentPlaylistSongs[index].title = title;
                }
                if ($scope.music.currentPlayingPlaylistId === currentPlaylistId) {
                    const index = $scope.music.currentPlayingPlaylistSongs.findIndex(s => s._id === songId);
                    $scope.music.currentPlayingPlaylistSongs[index].title = title;
                }
                Notification.success('Successfully renamed song');
            })
            .catch(err => Notification.info(err.data));
        $scope.music.renameSongTitle = '';
    };

    $scope.setPlaylist = item => {
        $scope.loading = true;
        $scope.music.currentPlaylistId = item._id;
        $scope.music.currentPlaylistName = item.name;
        MusicService.getPlaylist(item._id)
            .then(response => {
                if (response.data) {
                    $scope.music.currentPlaylistSongs = response.data;
                }
            })
            .catch(err => Notification.info(err.data))
            .finally(() => {
                $scope.loading = false;
            });
    };

    $scope.addSongModalShow = () => {
        return $scope.music.currentPlaylistId ? $scope.modals.addSong.modal('show') : Notification.info('Select playlist first');
    };

    $scope.renamePlaylistModalShow = () => {
        $scope.music.renamePlaylistName = $scope.music.currentPlaylistName;
        $scope.modals.renamePlaylist.modal('show');
    };

    $scope.renameSongModalShow = () => {
        $scope.music.renameSongTitle = $scope.music.currentSongTitle;
        $scope.modals.renameSong.modal('show');
    };

    $scope.addSongYoutube = () => {

    };

    $scope.selectFile = () => {
        const stopWatch = $scope.$watch('music.newSongFile', () => {
            if ($scope.music.newSongFile) {
                stopWatch();
                const currPlist = $scope.music.currentPlaylistId;
                $scope.modals.addSong.modal('hide');
                $scope.loading = true;
                Notification.info('Upload started...');
                MusicService.uploadSong(currPlist, $scope.music.newSongFile)
                    .then(response => {
                        if (response.data) {
                            Notification.info('Upload finished')
                        }
                        if (response.data && currPlist === $scope.music.currentPlaylistId) {
                            $scope.music.currentPlaylistSongs.unshift(...response.data);
                        }
                    })
                    .catch(err => Notification.info(err.data))
                    .finally(() => {
                        $scope.music.newSongFile = null;
                        $scope.loading = false;
                    })
            }
        });
        $scope.music.newSongInput.click();
    };

    $scope.setSong = (song, currentPlayingPlaylistId, currentPlayingPlaylistName, currentPlayingPlaylistSongs) => {
        $scope.pause();
        $scope.music.audio.src = `/song/${song._id}`;
        $scope.music.currentSongId = song._id;
        $scope.music.currentSongTitle = song.title;
        $scope.music.currentPlayingPlaylistId = currentPlayingPlaylistId || $scope.music.currentPlaylistId;
        $scope.music.currentPlayingPlaylistName = currentPlayingPlaylistName || $scope.music.currentPlaylistName;
        $scope.music.currentPlayingPlaylistSongs = currentPlayingPlaylistSongs || $scope.music.currentPlaylistSongs;
        $scope.play();
    };

    $scope.play = () => {
        if (!$scope.music.playing && $scope.music.currentSongId) {
            $scope.music.audio.play();
            $scope.music.playing = true;
        }
    };

    $scope.pause = () => {
        if ($scope.music.playing) {
            $scope.music.audio.pause();
            $scope.music.playing = false;
        }
    };

    $scope.next = manual => {
        if (!$scope.music.currentSongId) {
            return;
        }
        const songIndex = $scope.music.currentPlayingPlaylistSongs
            .findIndex(song => song._id === $scope.music.currentSongId);
        if ($scope.music.repeat && !manual) {
            return $scope.setSong(
                $scope.music.currentPlayingPlaylistSongs.songs[songIndex],
                $scope.music.currentPlayingPlaylistId,
                $scope.music.currentPlayingPlaylistName,
                $scope.music.currentPlayingPlaylistSongs
            );
        } else {
            let newIndex;
            if (songIndex === $scope.music.currentPlayingPlaylistSongs.length - 1) {
                newIndex = 0;
            } else {
                newIndex = songIndex + 1;
            }
            return $scope.setSong(
                $scope.music.currentPlayingPlaylistSongs[newIndex],
                $scope.music.currentPlayingPlaylistId,
                $scope.music.currentPlayingPlaylistName,
                $scope.music.currentPlayingPlaylistSongs
            );
        }
    };

    $scope.prev = () => {
        if (!$scope.music.currentSongId) {
            return;
        }
        let newIndex;
        const songIndex = $scope.music.currentPlayingPlaylistSongs
            .findIndex(song => song._id === $scope.music.currentSongId);
        newIndex = songIndex - 1;
        if (newIndex < 0) {
            newIndex = 0;
        }
        return $scope.setSong(
            $scope.music.currentPlayingPlaylistSongs[newIndex],
            $scope.music.currentPlayingPlaylistId,
            $scope.music.currentPlayingPlaylistName,
            $scope.music.currentPlayingPlaylistSongs
        );
    };

    $scope.footerPlaylistLink = () => {
        if ($scope.music.currentPlayingPlaylistId === $scope.music.currentPlaylistId) {
            Notification.info('Playlist already selected');
        } else {
            $scope.setPlaylist({
                _id: $scope.music.currentPlayingPlaylistId,
                name: $scope.music.currentPlayingPlaylistName,
            });
        }
    };

    $scope.convertTime = secs => {
        secs = parseInt(secs);
        const mins = Math.floor(secs / 60);
        const finalMins = mins < 10 ? `0${mins}` : mins;
        const remainingSecs = secs % 60;
        const finalSecs = remainingSecs < 10 ? `0${remainingSecs}` : remainingSecs;
        return (!isNaN(finalMins) && !isNaN(finalSecs)) ? `${finalMins}:${finalSecs}` : null;
    };

    $scope.updateTime = () => {
        $scope.music.currentTime = $scope.convertTime($scope.music.audio.currentTime);
        $scope.music.durationTime = $scope.music.audio.duration ?
            $scope.convertTime($scope.music.audio.duration) :
            $scope.music.durationTime;
    }

    /**
     * Checkers
     */
    $scope.showPlaylistActions = () => {
        return !!$scope.music.currentPlaylistId;
    };

    $scope.showSongActions = () => {
        return !!$scope.music.currentSongId;
    };

    /**
     * Copy songs wizard
     */
    $scope.copySongsWizard = {
        step: 0,
        srcPlaylist: null,
        songIDs: []
    };
    $scope.copySongsWizardSetPlaylist = item => {
        $scope.copySongsWizard.srcPlaylist = item;
        MusicService.getPlaylist(item._id)
            .then(response => {
                if (response.data) {
                    $scope.copySongsWizard.srcPlaylist.songs = response.data;
                    $scope.copySongsWizard.step = 1;
                }
            })
            .catch(err => Notification.info(err.data));
    };
    $scope.copySongsWizardFinish = (item) => {
        MusicService.copySongs(item._id, $scope.copySongsWizard.songIDs)
            .then(() => {
                Notification.success('Successfully copied songs');
                $scope.copyWizardClose();
                const currVisible = $scope.music.currentPlaylistId === item._id;
                const currPlaying = $scope.music.currentPlayingPlaylistId === item._id;
                if (currVisible || currPlaying) {
                    MusicService.getPlaylist(item._id)
                        .then(response => {
                            if (response.data) {
                                if (currVisible) {
                                    $scope.music.currentPlaylistSongs = response.data;
                                }
                                if (currPlaying) {
                                    $scope.music.currentPlayingPlaylistSongs = response.data;
                                }
                            }
                        })
                        .catch(err => Notification.error(err.data));
                }
            })
            .catch(err => Notification.error(err.data));
    };
    $scope.copySongsWizardSelectDestPlaylists = () => {
        $scope.copySongsWizard.songIDs = $scope.copySongsWizard.srcPlaylist.songs
            .filter(s => s.copyActive)
            .map(s => s._id);
        $scope.copySongsWizard.step = 2;
    };
    $scope.copyWizardBack = step => {
      if (step === 0) {
          $scope.copySongsWizard.srcPlaylist = null;
          $scope.copySongsWizard.step = 0;
      }
      if (step === 1) {
          $scope.copySongsWizard.srcPlaylist.songs = $scope.copySongsWizard.srcPlaylist.songs
              .map(s => {
                  s.copyActive = undefined;
                  return s;
              });
          $scope.copySongsWizard.step = 1;
      }
    };
    $scope.copyWizardClose = () => {
        $scope.modals.copySongs.modal('hide');
        $scope.copySongsWizard = {
            step: 0,
            srcPlaylist: null,
            songIDs: [],
            destPlaylistsIDs: []
        };
    };
    $scope.copyWizardStepDescription = () => {
        switch ($scope.copySongsWizard.step) {
            case 0:
                return 'Select source';
            case 1:
                return 'Select songs';
            case 2:
                return 'Select destination';
        }
    }

}
