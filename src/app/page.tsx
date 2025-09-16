'use client'

import {useState} from 'react'
import {useSession, signOut} from 'next-auth/react'

interface WorkspaceUser {
    id: string
    name: string
    email: string
    photoUrl?: string
    suspended: boolean
}

export default function Home() {
    const {data: session, status} = useSession()
    const today = new Date()
    const twoWeeksLater = new Date(today)
    twoWeeksLater.setDate(today.getDate() + 14)

    const formatDate = (date: Date) => {
        const month = date.getMonth() + 1
        const day = date.getDate()
        return `${month}月${day}日`
    }

    const [selectedMembers, setSelectedMembers] = useState<WorkspaceUser[]>([])
    const [startDate, setStartDate] = useState(today.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(twoWeeksLater.toISOString().split('T')[0])
    const [duration, setDuration] = useState('60')
    const [candidates, setCandidates] = useState<Array<{ date: string, time: string }>>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showEventForm, setShowEventForm] = useState(false)
    const [selectedCandidate, setSelectedCandidate] = useState<{ date: string, time: string } | null>(null)
    const [eventTitle, setEventTitle] = useState('')
    const [eventDescription, setEventDescription] = useState('')
    const [userAvailability, setUserAvailability] = useState<{ [email: string]: any }>({})
    const [showAvailabilityDetails, setShowAvailabilityDetails] = useState(false)
    const [newUserInput, setNewUserInput] = useState('')

    const handleMemberRemove = (memberId: string) => {
        setSelectedMembers(prev => prev.filter(member => member.id !== memberId))
    }

    const handleSearchCandidates = async () => {
        if (selectedMembers.length === 0) return

        setIsLoading(true)

        try {
            // 選択されたメンバーのメールアドレスを取得
            const emails = selectedMembers.map(member => member.email)

            // 期間の設定（開始日の00:00から終了日の23:59まで）
            const timeMin = new Date(`${startDate}T00:00:00.000Z`).toISOString()
            const timeMax = new Date(`${endDate}T23:59:59.999Z`).toISOString()

            console.log('=== 空き時間検索開始 ===')
            console.log('対象メンバー:', selectedMembers)
            console.log('メールアドレス一覧:', emails)
            console.log('検索期間:', {timeMin, timeMax})
            console.log('所要時間:', duration + '分')

            // FreeBusy API を呼び出し
            const response = await fetch('/api/freebusy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    emails,
                    timeMin,
                    timeMax
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error('FreeBusy API エラー:', errorData)
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
            }

            const freeBusyData = await response.json()
            console.log('=== FreeBusy APIレスポンス ===')
            console.log('取得データ:', freeBusyData)

            // 各ユーザーの不在情報を詳細出力
            Object.keys(freeBusyData.calendars).forEach(email => {
                const calendar = freeBusyData.calendars[email]
                console.log(`${email} の不在情報:`, calendar.busy || [])
            })

            // ユーザーの不在情報を保存
            setUserAvailability(freeBusyData.calendars)

            // 空き時間の候補を生成
            const candidates = findAvailableSlots(freeBusyData, parseInt(duration))
            console.log('=== 候補生成結果 ===')
            console.log('見つかった候補数:', candidates.length)
            console.log('候補一覧:', candidates)

            setCandidates(candidates)

        } catch (error) {
            console.error('Failed to search candidates:', error)
            alert('空き時間の検索に失敗しました。')
        } finally {
            setIsLoading(false)
        }
    }

    // 空き時間候補を見つける関数
    const findAvailableSlots = (freeBusyData: any, durationMinutes: number) => {
        const workingHours = {start: 9, end: 18} // 9:00-18:00
        const candidates: Array<{ date: string, time: string }> = []

        const start = new Date(startDate)
        const end = new Date(endDate)

        // 各日をチェック
        for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
            const dateStr = current.toISOString().split('T')[0]

            // 平日のみチェック（土日は除外）
            if (current.getDay() === 0 || current.getDay() === 6) continue

            // その日の忙しい時間帯を取得
            const busySlots = getAllBusySlots(freeBusyData, dateStr)

            // 空き時間を見つける
            const availableSlots = findDailyAvailableSlots(dateStr, busySlots, durationMinutes, workingHours)
            candidates.push(...availableSlots)
        }

        return candidates.slice(0, 10) // 最大10候補まで
    }

    // 指定日のすべてのメンバーの忙しい時間を取得
    const getAllBusySlots = (freeBusyData: any, dateStr: string) => {
        const allBusySlots: Array<{ start: Date, end: Date }> = []

        Object.values(freeBusyData.calendars).forEach((calendar: any) => {
            if (calendar.busy) {
                calendar.busy.forEach((slot: any) => {
                    const slotStart = new Date(slot.start)
                    const slotEnd = new Date(slot.end)
                    const slotDate = slotStart.toISOString().split('T')[0]

                    if (slotDate === dateStr) {
                        allBusySlots.push({start: slotStart, end: slotEnd})
                    }
                })
            }
        })

        // 重複する時間帯をマージ
        return mergeBusySlots(allBusySlots)
    }

    // 忙しい時間帯をマージする
    const mergeBusySlots = (slots: Array<{ start: Date, end: Date }>) => {
        if (slots.length === 0) return []

        const sorted = slots.sort((a, b) => a.start.getTime() - b.start.getTime())
        const merged: Array<{ start: Date, end: Date }> = [sorted[0]]

        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i]
            const last = merged[merged.length - 1]

            if (current.start <= last.end) {
                last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()))
            } else {
                merged.push(current)
            }
        }

        return merged
    }

    // 1日の空き時間を見つける
    const findDailyAvailableSlots = (dateStr: string, busySlots: Array<{
        start: Date,
        end: Date
    }>, durationMinutes: number, workingHours: { start: number, end: number }) => {
        const candidates: Array<{ date: string, time: string }> = []
        const date = new Date(dateStr)

        console.log(`${dateStr} の空き時間検索:`, {busySlots: busySlots.length, durationMinutes})

        // 勤務開始時間と終了時間
        const workStart = new Date(date)
        workStart.setHours(workingHours.start, 0, 0, 0)
        const workEnd = new Date(date)
        workEnd.setHours(workingHours.end, 0, 0, 0)

        // 忙しい時間がない場合、30分刻みで複数の候補を生成
        if (busySlots.length === 0) {
            console.log(`${dateStr}: 予定なし - 30分刻みで候補生成`)
            let currentTime = new Date(workStart)

            while (currentTime.getTime() + durationMinutes * 60000 <= workEnd.getTime()) {
                const candidateEnd = new Date(currentTime.getTime() + durationMinutes * 60000)

                candidates.push({
                    date: dateStr,
                    time: `${formatTime(currentTime)}-${formatTime(candidateEnd)}`
                })

                // 30分刻みで次の候補へ
                currentTime = new Date(currentTime.getTime() + 30 * 60000)

                // 最大3候補まで（1日あたり）
                if (candidates.length >= 3) break
            }
        } else {
            // 忙しい時間がある場合の既存ロジック
            let currentTime = new Date(workStart)

            for (const busySlot of busySlots) {
                console.log(`忙しい時間: ${formatTime(busySlot.start)}-${formatTime(busySlot.end)}`)

                // 現在時刻から忙しい時間の開始まで空いているかチェック
                if (currentTime < busySlot.start) {
                    const availableMinutes = (busySlot.start.getTime() - currentTime.getTime()) / (1000 * 60)

                    if (availableMinutes >= durationMinutes) {
                        // この空き時間で複数候補を生成
                        let slotTime = new Date(currentTime)

                        while (slotTime.getTime() + durationMinutes * 60000 <= busySlot.start.getTime()) {
                            const candidateEnd = new Date(slotTime.getTime() + durationMinutes * 60000)

                            candidates.push({
                                date: dateStr,
                                time: `${formatTime(slotTime)}-${formatTime(candidateEnd)}`
                            })

                            // 30分刻みで次の候補へ
                            slotTime = new Date(slotTime.getTime() + 30 * 60000)

                            // 最大2候補まで（空き時間あたり）
                            if (candidates.length >= 5) break
                        }
                    }
                }

                // 現在時刻を忙しい時間の終了時刻に更新
                currentTime = new Date(Math.max(currentTime.getTime(), busySlot.end.getTime()))
            }

            // 最後の忙しい時間の後に空き時間があるかチェック
            if (currentTime < workEnd) {
                const availableMinutes = (workEnd.getTime() - currentTime.getTime()) / (1000 * 60)

                if (availableMinutes >= durationMinutes) {
                    let slotTime = new Date(currentTime)

                    while (slotTime.getTime() + durationMinutes * 60000 <= workEnd.getTime()) {
                        const candidateEnd = new Date(slotTime.getTime() + durationMinutes * 60000)

                        candidates.push({
                            date: dateStr,
                            time: `${formatTime(slotTime)}-${formatTime(candidateEnd)}`
                        })

                        // 30分刻みで次の候補へ
                        slotTime = new Date(slotTime.getTime() + 30 * 60000)

                        // 最大2候補まで（空き時間あたり）
                        if (candidates.length >= 5) break
                    }
                }
            }
        }

        console.log(`${dateStr} の候補:`, candidates)
        return candidates
    }

    // 時刻を HH:MM 形式でフォーマット
    const formatTime = (date: Date) => {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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

    const handleAddNewUser = async () => {
        const trimmedInput = newUserInput.trim()
        if (!trimmedInput) return

        const email = `${trimmedInput}@social-db.co.jp`
        const userId = trimmedInput

        // 既に追加されているかチェック
        const existingUser = selectedMembers.find(user => user.email === email)
        if (existingUser) {
            setNewUserInput('')
            return
        }

        console.log('=== ユーザー存在確認開始 ===')
        console.log('確認対象:', email)

        try {
            // ユーザー存在確認APIを呼び出し
            const response = await fetch('/api/check-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({email})
            })

            const result = await response.json()
            console.log('ユーザー存在確認結果:', result)

            if (!response.ok) {
                console.error('ユーザー確認エラー:', result.error)
                alert(`ユーザー確認に失敗しました: ${result.error}`)
                return
            }

            // 新しいユーザーを選択済みメンバーに追加
            const newUser: WorkspaceUser = {
                id: userId,
                name: result.exists ? result.displayName || trimmedInput : `${trimmedInput} (未確認)`,
                email: email,
                photoUrl: result.photoUrl || '',
                suspended: false
            }

            console.log('=== 新しいユーザーを追加 ===')
            console.log('ユーザー情報:', newUser)
            console.log('存在確認:', result.exists ? '✅ 存在' : '❌ 不明')
            console.log('現在の選択済みメンバー数:', selectedMembers.length)

            if (!result.exists) {
                const confirmAdd = confirm(`${email} の存在を確認できませんでした。\nそれでも追加しますか？`)
                if (!confirmAdd) {
                    return
                }
            }

            setSelectedMembers(prev => {
                const updated = [...prev, newUser]
                console.log('更新後の選択済みメンバー:', updated)
                return updated
            })
            setNewUserInput('')

        } catch (error) {
            console.error('ユーザー確認処理エラー:', error)
            alert('ユーザー確認中にエラーが発生しました。')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-6">
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        📅 日程調整
                    </h1>
                    <p className="text-gray-600 mb-4">
                        メンバーの空き時間から最適な枠を見つけて、Google Calendarにイベントを作成します。
                    </p>

                    {/* Google認証ステータス */}
                    {session ? (
                        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                          clipRule="evenodd"/>
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
                                    <path fillRule="evenodd"
                                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"/>
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
                        {selectedMembers.length > 0 && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                                <h3 className="text-sm font-semibold text-blue-800 mb-3">
                                    選択中のメンバー ({selectedMembers.length}人)
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedMembers.map(member => (
                                        <div key={member.id}
                                             className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-full text-sm font-medium shadow-sm">
                                            <span>{member.name}</span>
                                            <button
                                                onClick={() => handleMemberRemove(member.id)}
                                                className="ml-2 hover:bg-blue-700 rounded-full p-0.5 transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M6 18L18 6M6 6l12 12"/>
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ユーザー追加フォーム */}
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                            <h3 className="text-sm font-semibold text-green-800 mb-3">
                                メンバーを追加
                            </h3>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={newUserInput}
                                        onChange={(e) => setNewUserInput(e.target.value)}
                                        placeholder="ユーザー名を入力..."
                                        className="text-gray-900 w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 pr-32"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddNewUser()
                                            }
                                        }}
                                    />
                                    <div
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                                        @social-db.co.jp
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddNewUser}
                                    disabled={!newUserInput.trim()}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                                >
                                    追加
                                </button>
                            </div>
                            <p className="text-xs text-green-600">
                                @social-db.co.jp ドメインのメールアドレスが自動で作成されます
                            </p>
                            {newUserInput.trim() && (
                                <p className="text-xs text-green-700 mt-1 font-medium">
                                    プレビュー: {newUserInput}@social-db.co.jp
                                </p>
                            )}
                        </div>

                        {selectedMembers.length === 0 && (
                            <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                                <svg className="mx-auto h-8 w-8 text-blue-400 mb-3" fill="none" stroke="currentColor"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                </svg>
                                <p className="text-sm text-blue-600 font-medium">
                                    上のフォームからメンバーを追加してください
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
                                <div
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none top-6">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M19 9l-7 7-7-7"/>
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

                    {/* ユーザー不在情報表示 */}
                    {Object.keys(userAvailability).length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    メンバー不在情報
                                </h2>
                                <button
                                    onClick={() => setShowAvailabilityDetails(!showAvailabilityDetails)}
                                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 transition-all duration-200 border border-blue-200 shadow-sm"
                                >
                                    {showAvailabilityDetails ? '詳細を隠す' : '詳細を表示'}
                                </button>
                            </div>

                            {showAvailabilityDetails && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {selectedMembers.map(member => {
                                        const availability = userAvailability[member.email]
                                        const busySlots = availability?.busy || []

                                        return (
                                            <div key={member.id}
                                                 className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center mb-3">
                                                    {member.photoUrl && (
                                                        <img
                                                            src={member.photoUrl}
                                                            alt={member.name}
                                                            className="w-6 h-6 rounded-full mr-2"
                                                        />
                                                    )}
                                                    <h3 className="text-sm font-semibold text-gray-900">{member.name}</h3>
                                                    <span className="ml-2 text-xs text-gray-500">({member.email})</span>
                                                </div>

                                                {busySlots.length > 0 ? (
                                                    <div className="space-y-2">
                                                        <p className="text-xs text-red-600 font-medium">
                                                            予定が入っている時間帯:
                                                        </p>
                                                        <div className="max-h-32 overflow-y-auto">
                                                            {busySlots.slice(0, 5).map((slot: any, index: number) => {
                                                                const startTime = new Date(slot.start)
                                                                const endTime = new Date(slot.end)
                                                                const date = startTime.toISOString().split('T')[0]
                                                                const timeRange = `${formatTime(startTime)}-${formatTime(endTime)}`

                                                                return (
                                                                    <div key={index}
                                                                         className="flex items-center text-xs">
                                                                        <div
                                                                            className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                                                                        <span className="text-gray-700">
                                                                            {date} {timeRange}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            })}
                                                            {busySlots.length > 5 && (
                                                                <p className="text-xs text-gray-500 mt-2">
                                                                    他 {busySlots.length - 5} 件の予定...
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-xs text-green-600">
                                                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                                        <span>指定期間中は予定なし</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            <p className="text-xs text-gray-500 mb-4">
                                各メンバーのGoogle Calendarから不在情報を取得済み（期間: {startDate} ~ {endDate}）
                            </p>
                        </div>
                    )}

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