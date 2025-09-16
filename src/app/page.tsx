'use client'

import {useState} from 'react'

const MOCK_MEMBERS = [
    {id: '1', name: '田中太郎', email: 'tanaka@example.com'},
    {id: '2', name: '佐藤花子', email: 'sato@example.com'},
    {id: '3', name: '鈴木一郎', email: 'suzuki@example.com'},
    {id: '4', name: '高橋美咲', email: 'takahashi@example.com'},
    {id: '5', name: '山田健太', email: 'yamada@example.com'},
]

export default function Home() {
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

    const handleMemberToggle = (memberId: string) => {
        setSelectedMembers(prev =>
            prev.includes(memberId)
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        )
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
                    <p className="text-gray-600 mb-8">
                        メンバーの空き時間から最適な研修枠を見つけて、Google Calendarにイベントを作成します。
                    </p>

                    {/* メンバー選択セクション */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            1. 対象メンバー選択
                        </h2>
                        <input
                            type="text"
                            placeholder="メンバーを検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                        />
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                            {filteredMembers.map(member => (
                                <label key={member.id} className="flex items-center mb-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedMembers.includes(member.id)}
                                        onChange={() => handleMemberToggle(member.id)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-sm text-gray-700">
                    {member.name} ({member.email})
                  </span>
                                </label>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            選択中: {selectedMembers.length}人
                        </p>
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
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
                            <p className="text-sm text-gray-600 mb-4">
                                全員が空いている候補です
                            </p>
                            <div className="space-y-3">
                                {candidates.map((candidate, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-4 border border-gray-200 rounded-md bg-white"
                                    >
                                        <div>
                      <span className="font-medium text-gray-900">
                        {candidate.date} {candidate.time}
                      </span>
                                        </div>
                                        <button
                                            onClick={() => handleCreateEvent(candidate)}
                                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
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
                        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-md">
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
                                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    イベント作成
                                </button>
                                <button
                                    onClick={() => setShowEventForm(false)}
                                    className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
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