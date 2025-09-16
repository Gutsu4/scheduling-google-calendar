'use client'

import {useState} from 'react'
import { useSession, signOut } from 'next-auth/react'

const MOCK_MEMBERS = [
    {id: '1', name: '田中太郎', email: 'tanaka@example.com'},
    {id: '2', name: '佐藤花子', email: 'sato@example.com'},
    {id: '3', name: '鈴木一郎', email: 'suzuki@example.com'},
    {id: '4', name: '高橋美咲', email: 'takahashi@example.com'},
    {id: '5', name: '山田健太', email: 'yamada@example.com'},
]

export default function Home() {
    const { data: session, status } = useSession()
    const today = new Date()
    const twoWeeksLater = new Date(today)
    twoWeeksLater.setDate(today.getDate() + 14)

    const formatDate = (date: Date) => {
        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${month}月${day}日`
    }

    const [selectedMembers, setSelectedMembers] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [startDate, setStartDate] = useState(today.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(twoWeeksLater.toISOString().split('T')[0])
    const [duration, setDuration] = useState('60')
    const [candidates, setCandidates] = useState<Array<{ date: string, time: string }>>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showEventForm, setShowEventForm] = useState(false)
    const [selectedCandidate, setSelectedCandidate] = useState<{ date: string, time: string } | null>(null)
    const [eventTitle, setEventTitle] = useState('')
    const [eventDescription, setEventDescription] = useState('')

    const filteredMembers = MOCK_MEMBERS.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleMemberAdd = (memberId: string) => {
        const member = MOCK_MEMBERS.find(m => m.id === memberId)
        if (member && !selectedMembers.includes(memberId)) {
            setSelectedMembers(prev => [...prev, memberId])
        }
    }

    const handleMemberRemove = (memberId: string) => {
        setSelectedMembers(prev => prev.filter(id => id !== memberId))
    }

    const getSelectedMembersData = () => {
        return selectedMembers.map(id => MOCK_MEMBERS.find(m => m.id === id)).filter(Boolean)
    }

    const handleSearchCandidates = async () => {
        if (selectedMembers.length === 0) return

        setIsLoading(true)

        // Mock API call simulation
        setTimeout(() => {
            const durationMinutes = parseInt(duration) || 120
            const generateTimeSlot = (startHour: number) => {
                const endMinutes = durationMinutes
                const endHour = startHour + Math.floor(endMinutes / 60)
                const endMin = endMinutes % 60
                const startTime = `${String(startHour).padStart(2, '0')}:00`
                const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
                return `${startTime}-${endTime}`
            }

            const mockCandidates = [
                {date: '2025-09-17', time: generateTimeSlot(9)},
                {date: '2025-09-17', time: generateTimeSlot(14)},
                {date: '2025-09-18', time: generateTimeSlot(10)},
                {date: '2025-09-19', time: generateTimeSlot(13)},
                {date: '2025-09-20', time: generateTimeSlot(9)},
            ]
            setCandidates(mockCandidates)
            setIsLoading(false)
        }, 2000)
    }

    const handleCreateEvent = (candidate: { date: string, time: string }) => {
        setSelectedCandidate(candidate)
        setShowEventForm(true)
    }

    const handleEventSubmit = () => {
        // Mock event creation
        alert(`イベント「${eventTitle}」を作成しました！\n日時: ${selectedCandidate?.date} ${selectedCandidate?.time}`)
        setShowEventForm(false)
        setEventTitle('')
        setEventDescription('')
        setSelectedCandidate(null)
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-6">
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        📅 日程調整
                    </h1>
                    <p className="text-gray-600 mb-4">
                        メンバーの空き時間から最適な研修枠を見つけて、Google Calendarにイベントを作成します。
                    </p>

                    {/* Google認証ステータス */}
                    {session ? (
                        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-green-800">
                                        Google Calendarに連携済み
                                    </h3>
                                    <p className="text-sm text-green-700 mt-1">
                                        {session.user?.name || session.user?.email} としてログイン中
                                    </p>
                                </div>
                                <button
                                    onClick={() => signOut()}
                                    className="ml-4 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-all duration-200 shadow-sm border border-green-200"
                                >
                                    ログアウト
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-blue-800">
                                        Google Calendar連携が必要です
                                    </h3>
                                    <p className="text-sm text-blue-700 mt-1">
                                        日程調整機能を使用するには、Google Calendarとの連携が必要です。
                                    </p>
                                </div>
                                <a
                                    href="/auth"
                                    className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow"
                                >
                                    連携設定
                                </a>
                            </div>
                        </div>
                    )}

                    {/* メンバー選択セクション */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            1. 対象メンバー選択
                        </h2>

                        {/* 選択済みメンバー（スタック表示） */}
                        {getSelectedMembersData().length > 0 && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                                <h3 className="text-sm font-semibold text-blue-800 mb-3">
                                    選択中のメンバー ({selectedMembers.length}人)
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {getSelectedMembersData().map(member => (
                                        <div key={member.id} className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-full text-sm font-medium shadow-sm">
                                            <span>{member.name}</span>
                                            <button
                                                onClick={() => handleMemberRemove(member.id)}
                                                className="ml-2 hover:bg-blue-700 rounded-full p-0.5 transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* メンバー検索・追加 */}
                        <input
                            type="text"
                            placeholder="メンバーを検索して追加..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-gray-900 w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4 shadow-sm"
                        />

                        {/* 検索結果 */}
                        {searchQuery && (
                            <div className="max-h-48 overflow-y-auto border border-blue-200 rounded-lg p-4 bg-blue-50 shadow-sm">
                                {filteredMembers.length > 0 ? (
                                    <div className="space-y-2">
                                        {filteredMembers.map(member => (
                                            <div key={member.id} className="flex items-center justify-between p-3 hover:bg-white rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 hover:shadow-sm">
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                                                    <div className="text-xs text-blue-600">{member.email}</div>
                                                </div>
                                                {selectedMembers.includes(member.id) ? (
                                                    <span className="text-xs text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full font-medium">
                                                        追加済み
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleMemberAdd(member.id)}
                                                        className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow"
                                                    >
                                                        追加
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-blue-600 text-center py-6 font-medium">
                                        該当するメンバーが見つかりません
                                    </p>
                                )}
                            </div>
                        )}

                        {!searchQuery && selectedMembers.length === 0 && (
                            <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                                <svg className="mx-auto h-8 w-8 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p className="text-sm text-blue-600 font-medium">
                                    上の検索ボックスでメンバーを検索してください
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 条件設定セクション */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            2. 条件設定
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    開始日 ({startDate ? formatDate(new Date(startDate)) : ''})
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    終了日 ({endDate ? formatDate(new Date(endDate)) : ''})
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    所要時間
                                </label>
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="text-gray-900 w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                >
                                    <option value="">選択してください</option>
                                    <option value="30">30分</option>
                                    <option value="60">60分</option>
                                    <option value="90">90分</option>
                                    <option value="120">120分</option>
                                    <option value="150">150分</option>
                                    <option value="180">180分</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none top-6">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">
                            勤務時間帯: 09:00-18:00 / 15分刻みで探索
                        </p>
                    </div>

                    {/* 検索実行 */}
                    <div className="mb-8">
                        <button
                            onClick={handleSearchCandidates}
                            disabled={selectedMembers.length === 0 || isLoading || !duration || !startDate || !endDate}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                        >
                            {isLoading ? '検索中...' : '空き時間を検索'}
                        </button>
                    </div>

                    {/* 候補一覧 */}
                    {candidates.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                3. 候補一覧
                            </h2>
                            <p className="text-sm text-blue-600 mb-4 font-medium">
                                全員が空いている候補です
                            </p>
                            <div className="space-y-3">
                                {candidates.map((candidate, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200 shadow-sm hover:shadow"
                                    >
                                        <div>
                      <span className="font-semibold text-blue-900">
                        {candidate.date} {candidate.time}
                      </span>
                                        </div>
                                        <button
                                            onClick={() => handleCreateEvent(candidate)}
                                            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                                        >
                                            イベント作成
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* イベント作成フォーム */}
                    {showEventForm && selectedCandidate && (
                        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                4. イベント作成
                            </h2>
                            <p className="text-gray-700 mb-4">
                                日時: {selectedCandidate.date} {selectedCandidate.time}
                            </p>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    タイトル
                                </label>
                                <input
                                    type="text"
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    placeholder="研修タイトルを入力..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    説明
                                </label>
                                <textarea
                                    value={eventDescription}
                                    onChange={(e) => setEventDescription(e.target.value)}
                                    placeholder="研修の詳細を入力..."
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                                />
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                ※ Google Meet リンクが自動で追加されます
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleEventSubmit}
                                    disabled={!eventTitle.trim()}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                                >
                                    イベント作成
                                </button>
                                <button
                                    onClick={() => setShowEventForm(false)}
                                    className="bg-blue-100 text-blue-700 px-6 py-2 rounded-lg hover:bg-blue-200 transition-all duration-200 font-medium border border-blue-200 shadow-sm"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}