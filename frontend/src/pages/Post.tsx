// Post detail page showing single post with comments

import { useState, useCallback, useEffect } from 'react'
import { Terminal } from '../components/Terminal'
import { renderTerminalPost } from '../components/TerminalPost'
import { renderLevelUpAnimation, getUnlockedFeatures } from '../components/LevelUpAnimation'
import { useTerminalCommands } from '../hooks/useTerminalCommands'
import { useAuth } from '../hooks/useAuth'
import { apiClient } from '../services/api-client'
import { green, yellow, red, cyan } from '../utils/ansi-colors'
import type { PostWithAuthor, CommentWithAuthor } from '../../../shared/types'
import '../styles/terminal.css'

interface PostDetailResponse {
  post: PostWithAuthor
  comments: CommentWithAuthor[]
}

interface PostPageProps {
  postId: string
}

export function PostPage({ postId }: PostPageProps) {
  const { user } = useAuth()
  const [post, setPost] = useState<PostWithAuthor | null>(null)
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [terminalOutput, setTerminalOutput] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const writeLine = useCallback((text: string) => {
    setTerminalOutput((prev) => prev + text + '\r\n')
  }, [])

  // Load post and comments
  useEffect(() => {
    loadPost()
  }, [postId])

  const loadPost = async () => {
    try {
      setIsLoading(true)
      const result = await apiClient.get<PostDetailResponse>(`/posts/${postId}`)
      setPost(result.post)
      setComments(result.comments)

      // Display post
      let output = ''
      output += green('Post Detail\r\n')
      output += '═'.repeat(60) + '\r\n'
      output += renderTerminalPost(result.post, true) + '\r\n'
      output += '\r\n'

      // Display comments
      if (result.comments.length > 0) {
        output += cyan(`Comments (${result.comments.length}):\r\n`)
        output += '\r\n'

        result.comments.forEach((comment) => {
          output += green(`@${comment.author.username}`) + ' ' + cyan(`[Lvl ${comment.author.level}]`) + '\r\n'
          output += comment.content + '\r\n'
          output += yellow(new Date(comment.created_at).toLocaleString()) + '\r\n'
          output += '─'.repeat(60) + '\r\n'
        })
      } else {
        output += yellow('No comments yet. Be the first to comment!\r\n')
      }

      setTerminalOutput(output)
    } catch (error) {
      writeLine(red(`✗ Failed to load post: ${(error as Error).message}`))
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = useCallback(
    async (postId: string) => {
      try {
        const result = await apiClient.post<any>(`/posts/${postId}/like`, {})

        writeLine(green('✓ Post liked!'))
        writeLine(yellow(`+${result.xp_awarded.liker} XP (you), +${result.xp_awarded.creator} XP (creator)`))

        if (result.level_up.liker && user) {
          writeLine('')
          const newLevel = user.level + 1
          const unlockedFeatures = getUnlockedFeatures(newLevel)
          writeLine(renderLevelUpAnimation(newLevel, unlockedFeatures))
          writeLine('')
        }

        // Refresh post to update like count
        await loadPost()
      } catch (error) {
        writeLine(red(`✗ Failed to like post: ${(error as Error).message}`))
      }
    },
    [writeLine]
  )

  const handleComment = useCallback(
    async (postId: string, content: string) => {
      try {
        const result = await apiClient.post<any>(`/posts/${postId}/comments`, { content })

        writeLine(green('✓ Comment posted!'))
        writeLine(yellow(`+${result.xp_awarded.commenter} XP`))

        if (result.xp_awarded.creator > 0) {
          writeLine(yellow(`+${result.xp_awarded.creator} XP (creator)`))
        }

        if (result.level_up.commenter && user) {
          writeLine('')
          const newLevel = user.level + 1
          const unlockedFeatures = getUnlockedFeatures(newLevel)
          writeLine(renderLevelUpAnimation(newLevel, unlockedFeatures))
          writeLine('')
        }

        // Refresh post
        await loadPost()
      } catch (error) {
        writeLine(red(`✗ Failed to post comment: ${(error as Error).message}`))
      }
    },
    [writeLine]
  )

  const { executeCommand } = useTerminalCommands({
    onLike: handleLike,
    onComment: handleComment,
    onHelp: () => {
      writeLine(yellow('Available commands:'))
      writeLine(`  /like ${postId.slice(0, 8)}          - Like this post`)
      writeLine(`  /comment ${postId.slice(0, 8)} <text> - Add a comment`)
      writeLine('  /help                         - Show this help')
    },
    onClear: () => {
      setTerminalOutput('')
    },
  })

  const handleCommand = useCallback(
    async (command: string) => {
      writeLine(`> ${command}`)
      const result = await executeCommand(command)
      if (result) {
        writeLine(result)
      }
    },
    [executeCommand, writeLine]
  )

  return (
    <div className="post-page">
      <Terminal onCommand={handleCommand} initialContent={terminalOutput} />
    </div>
  )
}
